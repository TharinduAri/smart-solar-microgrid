package com.sliit.smartsolar.util;

import android.app.Activity;
import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;

import com.sliit.smartsolar.R;

/**
 * Smart Solar Microgrid Trading System - Android Client.
 *
 * From Android 15 apps draw behind the status bar and the navigation bar. This
 * keeps a screen's content clear of both (and of the keyboard) so nothing is
 * hidden or untappable. The navy top bar (R.id.appBar) stretches up behind the
 * status bar, so screens look the same as on older Android versions.
 */
public final class SystemBars {

    private SystemBars() {
    }

    /** Pads the screen content by the size of the system bars and the keyboard. */
    public static void apply(Activity activity) {
        View content = activity.findViewById(android.R.id.content);
        View appBar = activity.findViewById(R.id.appBar);
        int appBarTop = appBar == null ? 0 : appBar.getPaddingTop();

        ViewCompat.setOnApplyWindowInsetsListener(content, (view, windowInsets) -> {
            Insets bars = windowInsets.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.ime());
            if (appBar == null) {
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else {
                view.setPadding(bars.left, 0, bars.right, bars.bottom);
                appBar.setPadding(appBar.getPaddingLeft(), appBarTop + bars.top,
                        appBar.getPaddingRight(), appBar.getPaddingBottom());
            }
            return WindowInsetsCompat.CONSUMED;
        });

        // Every screen starts with the navy bar, so the status bar icons stay light.
        WindowCompat.getInsetsController(activity.getWindow(), content).setAppearanceLightStatusBars(false);
    }
}
