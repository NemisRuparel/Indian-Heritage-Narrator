import * as react from 'react';
import { Appearance, Platform } from 'react-native';

interface ColorScheme {
  background: string;
  cardBackground: string;
  primaryAccent: string;
  secondaryAccent: string;
  textPrimary: string;
  textSecondary: string;
  placeholder: string;
  border: string;
  shadow: string;
  gradientStart: string;
  gradientEnd: string;
  iconColor: string;
  buttonText: string;
  danger: string;
  success: string;
  like: string;
}

interface FontSizesScheme {
  fontSize: string;
  heading: number;
  subheading: number;
  body: number;
  button: number;
}

interface FontsScheme {
  heading: string;
  subheading: string;
  body: string;
  button: string;
}

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  currentColors: ColorScheme;
  currentFonts: FontSizesScheme;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  currentLanguage: string;
  setLanguage: (lang: string) => void;
  globalFonts: FontsScheme;
}

const LightColors: ColorScheme = {
  background: '#F5F5F5',
  cardBackground: '#FFFFFF',
  primaryAccent: '#8B6F47',
  secondaryAccent: '#D2B48C',
  textPrimary: '#1C1C1C',
  textSecondary: '#6B6B6B',
  placeholder: '#A0A0A0',
  border: '#E0E0E0',
  shadow: 'rgba(0,0,0,0.1)',
  gradientStart: '#FFFFFF',
  gradientEnd: '#F5F5F5',
  iconColor: '#333333',
  buttonText: '#FFFFFF',
  danger: '#CF2A27',
  success: '#4CAF50',
  like: '#FF6347',
};

const DarkColors: ColorScheme = {
  background: '#0D0D0D',
  cardBackground: '#1C1C1C',
  primaryAccent: '#8B6F47',
  secondaryAccent: '#6B4E31',
  textPrimary: '#F5F5F5',
  textSecondary: '#B0B0B0',
  placeholder: '#707070',
  border: '#404040',
  shadow: 'rgba(0,0,0,0.5)',
  gradientStart: '#1C1C1C',
  gradientEnd: '#0D0D0D',
  iconColor: '#F5F5F5',
  buttonText: '#F5F5F5',
  danger: '#E57373',
  success: '#81C784',
  like: '#FF8A80',
};

const FontSizes = {
  small: {
    heading: 20,
    subheading: 16,
    body: 12,
    button: 14,
  },
  medium: {
    heading: 24,
    subheading: 18,
    body: 14,
    button: 16,
  },
  large: {
    heading: 28,
    subheading: 20,
    body: 16,
    button: 18,
  },
};

const globalFonts = {
  heading: Platform.OS === 'ios' ? 'AvenirNext-Bold' : 'Roboto-Bold',
  subheading: Platform.OS === 'ios' ? 'AvenirNext-Medium' : 'Roboto-Medium',
  body: Platform.OS === 'ios' ? 'AvenirNext-Regular' : 'Roboto-Regular',
  button: Platform.OS === 'ios' ? 'AvenirNext-DemiBold' : 'Roboto-Bold',
};

const ThemeContext = react.createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: react.ReactNode }) => {
  const colorScheme = Appearance.getColorScheme();
  const [isDarkMode, setIsDarkMode] = react.useState<boolean>(colorScheme === 'dark');
  const [currentFontSize, setCurrentFontSize] = react.useState<'small' | 'medium' | 'large'>('medium');
  const [currentLanguage, setCurrentLanguage] = react.useState<string>('en');

  react.useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setIsDarkMode(colorScheme === 'dark');
    });
    return () => subscription.remove();
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(prevMode => !prevMode);
  };

  const setFontSize = (size: 'small' | 'medium' | 'large') => {
    setCurrentFontSize(size);
  };

  const setLanguage = (lang: string) => {
    setCurrentLanguage(lang);
  };

  const currentColors = isDarkMode ? DarkColors : LightColors;
  const currentFonts = FontSizes[currentFontSize];

  return (
    <ThemeContext.Provider value={{
      isDarkMode,
      toggleDarkMode,
      currentColors,
      currentFonts,
      setFontSize,
      currentLanguage,
      setLanguage,
      globalFonts,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = react.useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};