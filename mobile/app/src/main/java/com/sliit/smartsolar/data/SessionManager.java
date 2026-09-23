package com.sliit.smartsolar.data;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;

import com.sliit.smartsolar.network.ApiClient;
import com.sliit.smartsolar.util.Format;

import org.json.JSONObject;

/**
 * Smart Solar Microgrid Trading System - Android Client.
 *
 * Keeps the signed in user in the local SQLite database so the session survives
 * an app restart, and pushes the stored token back into ApiClient on startup.
 * An expired login is thrown away so the user is sent back to the login screen.
 */
public class SessionManager {

    private final DatabaseHelper helper;

    public SessionManager(Context context) {
        this.helper = new DatabaseHelper(context.getApplicationContext());
    }

    /** Saves the login response returned by /api/auth/login into SQLite. */
    public void save(JSONObject loginResponse) {
        SQLiteDatabase db = helper.getWritableDatabase();
        db.delete(DatabaseHelper.TABLE_SESSION, null, null);

        ContentValues values = new ContentValues();
        values.put("user_id", loginResponse.optString("userId"));
        values.put("nic", loginResponse.optString("nic"));
        values.put("full_name", loginResponse.optString("fullName"));
        values.put("role", loginResponse.optString("role"));
        values.put("token", loginResponse.optString("token"));
        values.put("expires_at", loginResponse.optString("expiresAt"));
        db.insert(DatabaseHelper.TABLE_SESSION, null, values);

        ApiClient.setAuthToken(loginResponse.optString("token"));
    }

    /** Reads the stored session, or returns null when nobody is signed in or the login has expired. */
    public JSONObject load() {
        try (Cursor cursor = helper.getReadableDatabase()
                .query(DatabaseHelper.TABLE_SESSION, null, null, null, null, null, null, "1")) {
            if (!cursor.moveToFirst()) {
                return null;
            }
            JSONObject session = new JSONObject();
            session.put("userId", cursor.getString(cursor.getColumnIndexOrThrow("user_id")));
            session.put("nic", cursor.getString(cursor.getColumnIndexOrThrow("nic")));
            session.put("fullName", cursor.getString(cursor.getColumnIndexOrThrow("full_name")));
            session.put("role", cursor.getString(cursor.getColumnIndexOrThrow("role")));
            session.put("token", cursor.getString(cursor.getColumnIndexOrThrow("token")));

            String expiresAt = cursor.getString(cursor.getColumnIndexOrThrow("expires_at"));
            if (expiresAt == null || Format.isPast(expiresAt)) {
                clear();
                return null;
            }

            ApiClient.setAuthToken(session.optString("token"));
            return session;
        } catch (Exception ex) {
            return null;
        }
    }

    /** Keeps the name shown on the home screen in step after a profile edit. */
    public void updateFullName(String fullName) {
        ContentValues values = new ContentValues();
        values.put("full_name", fullName);
        helper.getWritableDatabase().update(DatabaseHelper.TABLE_SESSION, values, null, null);
    }

    /** Clears the stored session when the user signs out. */
    public void clear() {
        helper.getWritableDatabase().delete(DatabaseHelper.TABLE_SESSION, null, null);
        ApiClient.setAuthToken(null);
    }
}
