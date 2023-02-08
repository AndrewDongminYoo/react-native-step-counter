import * as React from 'react';
import {
  Button,
  Modal,
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
  const [snackbarContent, setSnackbarContent] = React.useState<string>();
  const showSnackbar = (title: string, response: unknown) =>
    setSnackbarContent(title + '\n\n' + JSON.stringify(response, null, 2));
  const hideSnackbar = () => setSnackbarContent(undefined);

  return (
    <SafeAreaView>
      <StatusBar barStyle="light-content" />
      <ScrollView>
        {PERMISSIONS_VALUES.map((item, index) => {
          const value = PERMISSIONS_VALUES[index] as Permission;
          const parts = item.split('.');
          const name = parts[parts.length - 1];
          return (
            <React.Fragment key={item}>
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
                          showSnackbar(`check(${name})`, status);
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
                          showSnackbar(`request(${name})`, status);
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
                    showSnackbar('checkNotifications()', response);
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
                    showSnackbar(
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

      <Modal visible={snackbarContent != null} onDismiss={hideSnackbar}>
        {snackbarContent}
      </Modal>
    </SafeAreaView>
  );
};

export default App;
