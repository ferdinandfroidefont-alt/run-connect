import { isReallyNative, getPlatform } from './nativeDetection';

export function getKeyBody(): { type: 'get-key'; platform?: string } {
  const body: { type: 'get-key'; platform?: string } = { type: 'get-key' };
  if (isReallyNative()) {
    body.platform = getPlatform();
  }
  return body;
}
