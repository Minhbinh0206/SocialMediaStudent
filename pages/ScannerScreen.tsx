import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Camera, useCameraDevices, CameraPermissionStatus } from 'react-native-vision-camera';

export default function ScannerScreen() {
    const devices = useCameraDevices();
    const device = devices.find((d) => d.position === 'back');

    const [hasPermission, setHasPermission] = useState<boolean>(false);

    useEffect(() => {
        (async () => {
            const permission: CameraPermissionStatus = await Camera.requestCameraPermission();

            if (permission === 'granted') {
                setHasPermission(true);
            } else {
                Alert.alert('Permission denied', 'Không thể sử dụng camera');
            }
        })();
    }, []);

    if (!device || !hasPermission) return <Text>Loading camera...</Text>;

    return (
        <View style={styles.container}>
            <Camera
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={true}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
});
