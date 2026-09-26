package com.sliit.smartsolar.util;

import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/**
 * Smart Solar Microgrid Trading System - Android Client.
 *
 * Turns the UTC times sent by the Web API into readable local times,
 * e.g. "2026-09-23T03:30:00Z" becomes "Wed 23 Sep, 9:00 AM" in Sri Lanka.
 */
public final class Format {

    private static final DateTimeFormatter DATE_TIME =
            DateTimeFormatter.ofPattern("EEE d MMM, h:mm a", Locale.ENGLISH).withZone(ZoneId.systemDefault());
    private static final DateTimeFormatter TIME =
            DateTimeFormatter.ofPattern("h:mm a", Locale.ENGLISH).withZone(ZoneId.systemDefault());
    private static final DecimalFormat ENERGY =
            new DecimalFormat("0.##", DecimalFormatSymbols.getInstance(Locale.ENGLISH));

    private Format() {
    }

    /** Formats an energy amount the way the web portal shows it, e.g. "10 kWh" or "15.5 kWh". */
    public static String energy(double kwh) {
        return ENERGY.format(kwh) + " kWh";
    }

    /** Formats an API timestamp as local day, date and time. */
    public static String dateTime(String iso) {
        try {
            return DATE_TIME.format(Instant.parse(iso));
        } catch (Exception ex) {
            return iso;
        }
    }

    /** Formats a booking window, e.g. "Wed 23 Sep, 9:00 AM - 12:00 PM". */
    public static String window(String startIso, String endIso) {
        try {
            return dateTime(startIso) + " - " + TIME.format(Instant.parse(endIso));
        } catch (Exception ex) {
            return dateTime(startIso);
        }
    }

    /** Returns true when the given API timestamp is already in the past. */
    public static boolean isPast(String iso) {
        try {
            return Instant.parse(iso).isBefore(Instant.now());
        } catch (Exception ex) {
            return false;
        }
    }
}
