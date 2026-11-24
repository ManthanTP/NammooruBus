package com.nammooru.bus;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();

        // 1. Enable true edge-to-edge drawing so app background flows under status bar (like Instagram)
        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);

        final View decorView = window.getDecorView();

        // 2. Measure status bar + punch-hole cutout and dynamically inject into WebView CSS (--safe-top)
        ViewCompat.setOnApplyWindowInsetsListener(decorView, (v, windowInsets) -> {
            Insets insets = windowInsets.getInsets(
                WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.displayCutout()
            );
            int topPx = Math.max(insets.top, getStatusBarHeightFallback());
            float density = getResources().getDisplayMetrics().density;
            int topDp = Math.round(topPx / density);

            Insets navInsets = windowInsets.getInsets(WindowInsetsCompat.Type.navigationBars());
            int bottomDp = Math.round(navInsets.bottom / density);

            if (bridge != null && bridge.getWebView() != null) {
                bridge.getWebView().post(() -> {
                    String js = "document.documentElement.style.setProperty('--safe-top', '" + topDp + "px');"
                              + "document.documentElement.style.setProperty('--safe-bottom', '" + bottomDp + "px');";
                    bridge.getWebView().evaluateJavascript(js, null);
                });
            }
            return windowInsets;
        });
    }

    private int getStatusBarHeightFallback() {
        int result = 0;
        int resourceId = getResources().getIdentifier("status_bar_height", "dimen", "android");
        if (resourceId > 0) {
            result = getResources().getDimensionPixelSize(resourceId);
        }
        return result;
    }
}
