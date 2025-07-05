import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Camera, useCameraDevices, useCodeScanner } from 'react-native-vision-camera'; // v4
// Nếu dùng plugin cũ:  import { useScanBarcodes, BarcodeFormat } from 'vision-camera-code-scanner';

type QRScannerProps = {
  onResult: (value: string) => void;
  onClose: () => void;
};

export default function QRScanner({ onResult, onClose }: QRScannerProps) {
  const [hasPerm, setHasPerm] = useState(false);
  const devices = useCameraDevices();
  const device = devices.find((d) => d.position === 'back');

  /* Yêu cầu quyền camera một lần */
  useEffect(() => {
    (async () => {
      const status = await Camera.requestCameraPermission();
      setHasPerm(status === 'granted');
    })();
  }, []);

  /* Hook quét QR built‑in (v4) */
  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: (codes) => {
      if (codes.length) {
        const value = codes[0].value ?? '';
        onResult(value);    // trả QR lên EventDetail
      }
    },
  });

  /* Nếu project ở VisionCamera v3 + plugin
  const [frameProcessor, barcodes] = useScanBarcodes([BarcodeFormat.QR_CODE], {checkInverted:true});
  useEffect(() => {
    if (barcodes.length) onResult(barcodes[0].displayValue);
  }, [barcodes]);
  */

  if (!device || !hasPerm) return null;

  return (
    <View style={styles.full}>
      <Camera
        style={styles.full}
        device={device}
        isActive={true}
        codeScanner={codeScanner}           // v4             👈
        /* v3: frameProcessor={frameProcessor} frameProcessorFps={5} */
      />

      {/* khung ngắm + nút đóng */}
      <View style={styles.overlay}>
        <View style={styles.marker}/>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Text style={{color:'#fff',fontSize:18}}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, backgroundColor: '#000' },
  overlay:{ ...StyleSheet.absoluteFillObject, justifyContent:'center', alignItems:'center' },
  marker:{ width:220, height:220, borderWidth:3, borderColor:'#00eaff', borderRadius:12 },
  closeBtn:{ position:'absolute', top:40, right:20, padding:8 },
});
