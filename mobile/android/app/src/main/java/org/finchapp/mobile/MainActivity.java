package org.finchapp.mobile;

import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.view.KeyEvent;
import android.webkit.WebView;
import android.webkit.WebBackForwardList;
import android.window.OnBackInvokedDispatcher;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final long SPLASH_POLL_INTERVAL_MS = 250L;
    private static final int SPLASH_MAX_POLLS = 60;

    @Override
    protected void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        hideSplashAfterWebViewLoad();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                OnBackInvokedDispatcher.PRIORITY_OVERLAY,
                this::handleBackPressed
            );
        } else {
            getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
                @Override
                public void handleOnBackPressed() {
                    handleBackPressed();
                }
            });
        }
    }

    @Override
    public void onBackPressed() {
        handleBackPressed();
    }

    @Override
    public boolean onKeyUp(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            handleBackPressed();
            return true;
        }
        return super.onKeyUp(keyCode, event);
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getKeyCode() == KeyEvent.KEYCODE_BACK && event.getAction() == KeyEvent.ACTION_UP) {
            handleBackPressed();
            return true;
        }
        return super.dispatchKeyEvent(event);
    }

    private void handleBackPressed() {
        WebView webView = getBridge() == null ? null : getBridge().getWebView();
        if (webView != null && hasBackHistory(webView)) {
            webView.goBack();
        } else {
            finishAndRemoveTask();
        }
    }

    private void hideSplashAfterWebViewLoad() {
        Handler handler = new Handler(Looper.getMainLooper());
        handler.post(new Runnable() {
            private int attempts;

            @Override
            public void run() {
                if (attempts++ >= SPLASH_MAX_POLLS) {
                    WebView webView = getBridge() == null ? null : getBridge().getWebView();
                    if (webView != null) {
                        webView.evaluateJavascript(
                            "window.Capacitor?.Plugins?.SplashScreen?.hide?.();", null
                        );
                    }
                    return;
                }

                WebView webView = getBridge() == null ? null : getBridge().getWebView();
                if (webView == null) {
                    handler.postDelayed(this, SPLASH_POLL_INTERVAL_MS);
                    return;
                }

                webView.evaluateJavascript(
                    "(document.readyState === 'complete' && " +
                    "(location.hostname === 'app.finchapp.org' || location.pathname.endsWith('/offline.html')))" ,
                    value -> {
                        if ("true".equals(value)) {
                            webView.evaluateJavascript(
                                "window.Capacitor?.Plugins?.SplashScreen?.hide?.();", null
                            );
                        } else {
                            handler.postDelayed(this, SPLASH_POLL_INTERVAL_MS);
                        }
                    }
                );
            }
        });
    }

    private boolean hasBackHistory(WebView webView) {
        WebBackForwardList history = webView.copyBackForwardList();
        return history.getCurrentIndex() > 0;
    }
}
