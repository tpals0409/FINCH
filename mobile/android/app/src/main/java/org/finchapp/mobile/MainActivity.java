package org.finchapp.mobile;

import android.os.Build;
import android.view.KeyEvent;
import android.webkit.WebView;
import android.webkit.WebBackForwardList;
import android.window.OnBackInvokedDispatcher;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
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

    private boolean hasBackHistory(WebView webView) {
        WebBackForwardList history = webView.copyBackForwardList();
        return history.getCurrentIndex() > 0;
    }
}
