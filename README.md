# ReactNative Firebase + Nativewind starter

This repo helps users get a react-native firebase project setup and running without wasting any time fixing `npx expo run:${platform}` errors when using **@react-native-firebase/app** and enjoy the perks of **Nativewind!**

## Prerequisite

### Step 1 – Firebase console

- Go to console.firebase.google.com and create a project (skip Analytics unless you need it now – you can enable later)
- **Add an Android app.** Package name = your app.json expo.android.package (e.g. com.acme.myapp). Download `google-services.json`
- **Add an iOS app.** Bundle ID = your app.json expo.ios.bundleIdentifier. Download `GoogleService-Info.plist`.

### Step 2 – Place config files.

- Create a folder in the root of the project called `google-services` and put both `google-services.json` and `GoogleService-Info.plist` files. These paths are automatically references inside this project's `app.json` file.

### Step 3 – Install packages, update Podfile, and build separate environments

- `bun install`
- `npx expo prebuild --clean`
- In **/ios/Podfile** replace its code with the following code:

```
require File.join(File.dirname(node --print "require.resolve('expo/package.json')"), "scripts/autolinking")
require File.join(File.dirname(node --print "require.resolve('react-native/package.json')"), "scripts/react_native_pods")

require 'json'
podfile_properties = JSON.parse(File.read(File.join(_dir_, 'Podfile.properties.json'))) rescue {}

def ccache_enabled?(podfile_properties)
  # Environment variable takes precedence
  return ENV['USE_CCACHE'] == '1' if ENV['USE_CCACHE']

  # Fall back to Podfile properties
  podfile_properties['apple.ccacheEnabled'] == 'true'
end

ENV['RCT_NEW_ARCH_ENABLED'] ||= '0' if podfile_properties['newArchEnabled'] == 'false'
ENV['EX_DEV_CLIENT_NETWORK_INSPECTOR'] ||= podfile_properties['EX_DEV_CLIENT_NETWORK_INSPECTOR']
ENV['RCT_USE_RN_DEP'] ||= '1' if podfile_properties['ios.buildReactNativeFromSource'] != 'true' && podfile_properties['newArchEnabled'] != 'false'
ENV['RCT_USE_PREBUILT_RNCORE'] ||= '1' if podfile_properties['ios.buildReactNativeFromSource'] != 'true' && podfile_properties['newArchEnabled'] != 'false'
platform :ios, podfile_properties['ios.deploymentTarget'] || '15.1'

prepare_react_native_project!

target 'metrimoon' do
  use_expo_modules!

  if ENV['EXPO_USE_COMMUNITY_AUTOLINKING'] == '1'
    config_command = ['node', '-e', "process.argv=['', '', 'config'];require('@react-native-community/cli').run()"];
  else
    config_command = [
      'node',
      '--no-warnings',
      '--eval',
      'require(\'expo/bin/autolinking\')',
      'expo-modules-autolinking',
      'react-native-config',
      '--json',
      '--platform',
      'ios'
    ]
  end

  config = use_native_modules!(config_command)

  use_frameworks! :linkage => podfile_properties['ios.useFrameworks'].to_sym if podfile_properties['ios.useFrameworks']
  use_frameworks! :linkage => ENV['USE_FRAMEWORKS'].to_sym if ENV['USE_FRAMEWORKS']
  $RNFirebaseAsStaticFramework = true

  use_react_native!(
    :path => config[:reactNativePath],
    :hermes_enabled => podfile_properties['expo.jsEngine'] == nil || podfile_properties['expo.jsEngine'] == 'hermes',
    # An absolute path to your application root.
    :app_path => "#{Pod::Config.instance.installation_root}/..",
    :privacy_file_aggregation_enabled => podfile_properties['apple.privacyManifestAggregationEnabled'] != 'false',
  )

  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      :ccache_enabled => ccache_enabled?(podfile_properties),
    )

    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        build_config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        if target.name.start_with?('RNFB')
          build_config.build_settings['CLANG_ENABLE_MODULES'] = 'NO'
        end
      end
    end
  end
end
```

This code block is essential to get rid of the errors that occur while run `npx expo run:ios`. Make sure to update this file with the above content every time you run `npx expo prebuild --clean`

- Run `npx expo run:ios` and `npx expo run:android` in separate terminal windows. This can take some time depending upon how fast your machine is.

**Note:** This project used bun, sticking with bun is recommended but you can use any other package manager you like, make sure to only have the lockfile of your desired package manager.

### Step 4 – Confirm connection.

The code for confirming the connection is already implemented in `/app/index.tsx`

**However** You must have to enable anonymous sign-in provider manually from your firebase console at least once (You can disable it after confirming that the connection is established),

**How to enable anonymous sign-in** Go to `console.firebase.google.com`, from the left-side menu go to Settings->Authentication->Find or create the anonymous sign-in provider and enable it.

Once you see this metro log in your terminal: **✅ Signed in anonymously** then congratulations! your app is successfully connected to your firebase. You can remove the boilerplate code from `index.tsx` and disable sign-in anonymously now.

Happy Coding!

## What is @react-native-firebase/app

React Native Firebase is the officially recommended collection of packages that brings React Native support for all Firebase services on both Android and iOS apps. If you want to know more about it, click [here](https://rnfirebase.io/)

## What's the difference between @react-native-firebase/app and Native Firebase SDK?

Two completely separate layers that work together.

### Native Firebase SDK

(`FirebaseCore`, `FirebaseFirestore`, `FirebaseAuth`, etc.)

These are Apple's official Firebase libraries — prebuilt C++/ObjC/Swift binaries
distributed via CocoaPods. They talk directly to Firebase's backend servers.
They have no concept of React Native. Your iOS device actually executes this code.

### `@react-native-firebase/*`

(`RNFBApp`, `RNFBFirestore`, etc.)

These are bridge layers written by the Invertase team. They have no Firebase logic
of their own — they just expose the native SDK's functionality to your JavaScript.
Each module is essentially a thin ObjC/Swift wrapper that:

1. Receives calls from your JS (e.g. `firestore().collection('users').get()`)
2. Translates them into native SDK calls (`[FIRFirestore ... ]`)
3. Serializes the result back to JS-compatible data

That's exactly what `RNFBFirestoreSerialize` does — it takes a native
`FIRQuerySnapshot` object (a native SDK type) and converts it into an
`NSDictionary` that can cross the JS bridge.

## Why Use `@react-native-firebase` Instead of the Native Firebase SDK Directly?

The short answer: **you can't call native ObjC/Swift/C++ code from JavaScript directly.** React Native runs your app logic in a JS engine (Hermes). It has no idea what `FIRFirestore` or `FIRAuth` is.

---

### The Bridge Problem

React Native apps have two worlds running in parallel:

```
┌─────────────────────────────┐
│     JavaScript Thread       │  ← your app logic lives here
│   (Hermes JS Engine)        │
└────────────┬────────────────┘
             │  JS Bridge / JSI
┌────────────▼────────────────┐
│     Native Thread           │  ← ObjC / Swift / C++ lives here
│   (iOS / Android)           │
└─────────────────────────────┘
```

The native Firebase SDK lives entirely in the **native thread**. Your JS code has no way to reach it without a bridge.

---

### What `@react-native-firebase` Provides

| Concern                        | Native SDK Alone | `@react-native-firebase` |
| ------------------------------ | ---------------- | ------------------------ |
| Callable from JS               | ❌               | ✅                       |
| Type-safe JS API               | ❌               | ✅                       |
| Async / Promise support        | ❌               | ✅                       |
| Cross-platform (iOS + Android) | ❌               | ✅                       |
| Event listeners in JS          | ❌               | ✅                       |

---

### Concrete Example

Without the bridge, this JS is impossible:

```js
// This can NOT talk to FIRFirestore directly
const doc = await firestore().collection("users").doc("abc").get();
```

Under the hood, `@react-native-firebase` translates it to:

```objc
// Native side — what actually runs on device
FIRDocumentReference *ref = [[FIRFirestore firestore] documentWithPath:@"users/abc"];
[ref getDocumentWithCompletion:^(FIRDocumentSnapshot *snap, NSError *err) {
    // serialize snap → NSDictionary → resolve JS Promise
}];
```

You'd have to write this ObjC yourself, register it as a native module, handle
serialization, manage threads, and repeat it all for Android in Java/Kotlin —
for every single Firebase feature.

---

### Summary

`@react-native-firebase` is not an alternative to the native SDK. It **depends on it**.
What it gives you is the bridge layer so your JavaScript can drive the native SDK
without you having to write and maintain hundreds of native module files yourself.
