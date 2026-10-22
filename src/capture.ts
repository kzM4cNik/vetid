import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export type Prepared = { uri: string; base64: string; width: number; height: number };

const SIDE = 480;

export async function prepareCameraShot(
  photo: { uri: string; width: number; height: number },
  view: { width: number; height: number; cx: number; cy: number; r: number }
): Promise<Prepared> {
  const pw = photo.width;
  const ph = photo.height;
  const scale = Math.max(view.width / pw, view.height / ph);
  const offX = (pw * scale - view.width) / 2;
  const offY = (ph * scale - view.height) / 2;
  const side = Math.min(pw, ph, (view.r * 2 * 1.25) / scale);
  const cx = (view.cx + offX) / scale;
  const cy = (view.cy + offY) / scale;
  const originX = Math.max(0, Math.min(pw - side, cx - side / 2));
  const originY = Math.max(0, Math.min(ph - side, cy - side / 2));

  const out = await manipulateAsync(
    photo.uri,
    [{ crop: { originX, originY, width: side, height: side } }, { resize: { width: SIDE, height: SIDE } }],
    { compress: 0.8, format: SaveFormat.JPEG, base64: true }
  );
  return { uri: out.uri, base64: out.base64 ?? '', width: out.width, height: out.height };
}

export async function prepareLibraryImage(asset: { uri: string; width: number; height: number }): Promise<Prepared> {
  const k = 640 / Math.max(asset.width || 640, asset.height || 640);
  const actions = k < 1 ? [{ resize: { width: Math.round(asset.width * k), height: Math.round(asset.height * k) } }] : [];
  const out = await manipulateAsync(asset.uri, actions, { compress: 0.85, format: SaveFormat.JPEG, base64: true });
  return { uri: out.uri, base64: out.base64 ?? '', width: out.width, height: out.height };
}
