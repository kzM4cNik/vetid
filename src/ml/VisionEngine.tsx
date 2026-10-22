import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { ENGINE_HTML } from './engineHtml.generated';
import type { ClassifyResult, EngineStatus } from './types';

type Pending = { resolve: (r: ClassifyResult) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> };

type EngineApi = {
  status: EngineStatus;
  classify: (base64: string) => Promise<ClassifyResult>;
  reload: () => void;
};

const EngineContext = createContext<EngineApi | null>(null);

export function useVisionEngine() {
  const ctx = useContext(EngineContext);
  if (!ctx) throw new Error('useVisionEngine must be used inside VisionEngineProvider');
  return ctx;
}

export function VisionEngineProvider({ children }: { children: ReactNode }) {
  const webRef = useRef<{ injectJavaScript: (js: string) => void; reload: () => void } | null>(null);
  const pending = useRef(new Map<string, Pending>());
  const seq = useRef(0);
  const [status, setStatus] = useState<EngineStatus>({ state: 'loading', progress: 0, stage: 'init' });

  const onMessage = useCallback((e: WebViewMessageEvent) => {
    let msg: any;
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'progress') {
      setStatus((s) => (s.state === 'ready' ? s : { state: 'loading', progress: msg.value, stage: msg.stage }));
    } else if (msg.type === 'ready') {
      setStatus({ state: 'ready', backend: msg.backend, cached: msg.cached });
    } else if (msg.type === 'result' || msg.type === 'error') {
      const p = msg.id ? pending.current.get(msg.id) : undefined;
      if (p) {
        clearTimeout(p.timer);
        pending.current.delete(msg.id);
        if (msg.type === 'result') p.resolve(msg as ClassifyResult);
        else p.reject(new Error(msg.message));
      } else if (msg.type === 'error') {
        setStatus({ state: 'error', message: msg.message });
      }
    }
  }, []);

  const classify = useCallback((base64: string) => {
    const id = `req-${++seq.current}`;
    return new Promise<ClassifyResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.current.delete(id);
        reject(new Error('Нейросеть не ответила вовремя'));
      }, 20000);
      pending.current.set(id, { resolve, reject, timer });
      webRef.current?.injectJavaScript(`window.__vetidClassify(${JSON.stringify(id)}, ${JSON.stringify(base64)}); true;`);
    });
  }, []);

  const reload = useCallback(() => {
    setStatus({ state: 'loading', progress: 0, stage: 'init' });
    webRef.current?.reload();
  }, []);

  const api = useMemo(() => ({ status, classify, reload }), [status, classify, reload]);

  return (
    <EngineContext.Provider value={api}>
      {children}
      <View pointerEvents="none" style={styles.hidden}>
        <WebView
          ref={webRef as never}
          source={{ html: ENGINE_HTML, baseUrl: 'https://vetid.app/' }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          onMessage={onMessage}
          onContentProcessDidTerminate={reload}
          webviewDebuggingEnabled={__DEV__}
          style={styles.web}
        />
      </View>
    </EngineContext.Provider>
  );
}

const styles = StyleSheet.create({
  hidden: { position: 'absolute', width: 2, height: 2, left: 0, top: 0, opacity: 0, overflow: 'hidden' },
  web: { width: 2, height: 2, backgroundColor: 'transparent' },
});
