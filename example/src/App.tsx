import * as React from 'react';
import {
  Button,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import RNPermissions, {
  NotificationOption,
  Permission,
  PERMISSIONS,
} from 'react-native-permissions';
const PERMISSIONS_VALUES: Permission[] = Object.values(
  Platform.OS === 'ios' ? PERMISSIONS.IOS : PERMISSIONS.ANDROID
);

const App = () => {
  return (
    <SafeAreaView>
      <StatusBar barStyle="light-content" />
      <ScrollView>
        {PERMISSIONS_VALUES.map((value) => {
          const parts = value.split('.');
          const name = parts[parts.length - 1];
          return (
            <React.Fragment key={value}>
              <View style={{ padding: 20 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    color: 'rgba(0, 0, 0, 0.87)',
                    fontWeight: '400',
                    fontSize: 16,
                    textAlign: 'left',
                  }}
                >
                  {name}
                </Text>
                <View style={{ flexDirection: 'row', marginTop: 12 }}>
                  <Button
                    onPress={() => {
                      RNPermissions.check(value)
                        .then((status) => {
                          console.debug(`check(${name})`, status);
                        })
                        .catch((error) => {
                          console.error(error);
                        });
                    }}
                    title="Check"
                  />

                  <View style={{ width: 8 }} />

                  <Button
                    onPress={() => {
                      RNPermissions.request(value)
                        .then((status) => {
                          console.debug(`request(${name})`, status);
                        })
                        .catch((error) => {
                          console.error(error);
                        });
                    }}
                    title="Request"
                  />
                </View>
              </View>
            </React.Fragment>
          );
        })}
        <View style={{ padding: 20, paddingBottom: 32 }}>
          <Text
            numberOfLines={1}
            style={{
              color: 'rgba(0, 0, 0, 0.87)',
              fontWeight: '400',
              fontSize: 16,
              textAlign: 'left',
            }}
          >
            NOTIFICATIONS
          </Text>

          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <Button
              onPress={() => {
                RNPermissions.checkNotifications()
                  .then((response) => {
                    console.debug('checkNotifications()', response);
                  })
                  .catch((error) => {
                    console.error(error);
                  });
              }}
              title="Check"
            />

            <View style={{ width: 8 }} />

            <Button
              onPress={() => {
                const options: NotificationOption[] = [
                  'alert',
                  'badge',
                  'sound',
                ];

                RNPermissions.requestNotifications(options)
                  .then((response) => {
                    console.debug(
                      `requestNotifications([${options
                        .map((option) => `"${option}"`)
                        .join(', ')}])`,
                      response
                    );
                  })
                  .catch((error) => {
                    console.error(error);
                  });
              }}
              title="Request"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default App;
