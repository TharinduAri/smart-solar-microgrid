package com.sliit.smartsolar.util;

import android.content.Context;
import android.content.res.ColorStateList;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.core.content.ContextCompat;
import androidx.core.widget.ImageViewCompat;

import com.sliit.smartsolar.R;

/**
 * Smart Solar Microgrid Trading System - Android Client.
 *
 * Colours for booking statuses, shared with the web portal: Pending is amber,
 * Approved green, Completed blue and Cancelled grey (reservationTone and tones
 * in web/src/theme.js).
 */
public final class Tones {

    private Tones() {
    }

    /** Shows a status as a coloured label, like the status chips on the web. */
    public static void statusLabel(TextView label, String status) {
        int[] tone = forStatus(status);
        Context context = label.getContext();
        label.setText(status);
        label.setTextColor(ContextCompat.getColor(context, tone[0]));
        label.setBackgroundTintList(ColorStateList.valueOf(ContextCompat.getColor(context, tone[1])));
    }

    /** Tints a round icon badge with the colours of a status. */
    public static void statusIcon(ImageView icon, String status) {
        int[] tone = forStatus(status);
        Context context = icon.getContext();
        ImageViewCompat.setImageTintList(icon, ColorStateList.valueOf(ContextCompat.getColor(context, tone[0])));
        icon.setBackgroundTintList(ColorStateList.valueOf(ContextCompat.getColor(context, tone[1])));
    }

    /** Text and background colour resources for a reservation status. */
    private static int[] forStatus(String status) {
        switch (status) {
            case "Pending":
                return new int[]{R.color.tone_warning_fg, R.color.tone_warning_bg};
            case "Approved":
                return new int[]{R.color.tone_success_fg, R.color.tone_success_bg};
            case "Completed":
                return new int[]{R.color.tone_info_fg, R.color.tone_info_bg};
            default:
                return new int[]{R.color.tone_neutral_fg, R.color.tone_neutral_bg};
        }
    }
}
