// import React from 'react'
// import { NavigationContainer } from '@react-navigation/native'
// import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
// import { ClerkProvider } from '@clerk/clerk-expo'
// import * as SecureStore from 'expo-secure-store'

// import Home from './(tabs)/Home'
// import Settings from './(tabs)/settings'
// import Auth from './(tabs)/auth'

// const Tab = createBottomTabNavigator()

// const tokenCache = {
//   async getToken(key) {
//     try { return await SecureStore.getItemAsync(key) } catch { return null }
//   },
//   async saveToken(key, value) {
//     try { await SecureStore.setItemAsync(key, value) } catch {}
//   }
// }

// const publishableKey = 'pk_test_dG9waWNhbC13aGlwcGV0LTgzLmNsZXJrLmFjY291bnRzLmRldiQ'

// export default function App() {
//   return (
//     <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
//       <NavigationContainer>
//         <Tab.Navigator screenOptions={{ headerShown: false }}>
//           <Tab.Screen name="Home" component={Home} />
//           <Tab.Screen
//             name="Settings"
//             component={(props) => (
//               <Settings
//                 isVisible={true}
//                 onClose={() => {}}
//                 setEditProfileModal={() => {}}
//                 setActiveTab={() => {}}
//                 // Add other required props with default or mock values here
//                 {...props}
//               />
//             )}
//           />
//           <Tab.Screen name="Auth" component={Auth} />
//         </Tab.Navigator>
//       </NavigationContainer>
//     </ClerkProvider>
//   )
// }
