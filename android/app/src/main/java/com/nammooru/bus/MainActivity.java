package com.nammooru.bus;

import android.os.Bundle;
import android.view.View;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Ensure Android window decor does not overlay system bars
        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        final View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            final int fallbackHeight = getStatusBarHeightFallback();
            // Apply immediate padding so the webview begins strictly below the status bar
            // on first render
            contentView.setPadding(0, fallbackHeight, 0, 0);

            // Listen for window insets (handles punch-hole cameras, display cutouts, and
            // dynamic status bars)
            ViewCompat.setOnApplyWindowInsetsListener(contentView, (v, windowInsets) -> {
                Insets insets = windowInsets.getInsets(
                        WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.displayCutout());
                int topPadding = Math.max(insets.top, fallbackHeight);
                v.setPadding(0, topPadding, 0, 0);
                return windowInsets;
            });
        }
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
