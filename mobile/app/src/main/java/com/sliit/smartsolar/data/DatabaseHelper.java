package com.sliit.smartsolar.data;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Smart Solar Microgrid Trading System - Android Client.
 *
 * Local SQLite database used for on-device persistence only: the signed in user
 * session and a cached copy of the microgrid nodes so the map screen can still
 * draw markers when the device is briefly offline. The server side data always
 * lives in MongoDB behind the Web API.
 */
public class DatabaseHelper extends SQLiteOpenHelper {

    private static final String DB_NAME = "smart_solar.db";
    private static final int DB_VERSION = 1;

    public static final String TABLE_SESSION = "user_session";
    public static final String TABLE_STATIONS = "cached_stations";

    public DatabaseHelper(Context context) {
        super(context, DB_NAME, null, DB_VERSION);
    }

    /** Creates the local tables the first time the app runs on a device. */
    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE " + TABLE_SESSION + " ("
                + "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                + "user_id TEXT, "
                + "nic TEXT, "
                + "full_name TEXT, "
                + "role TEXT, "
                + "token TEXT)");

        db.execSQL("CREATE TABLE " + TABLE_STATIONS + " ("
                + "id TEXT PRIMARY KEY, "
                + "name TEXT, "
                + "location TEXT, "
                + "latitude REAL, "
                + "longitude REAL, "
                + "capacity_kwh REAL)");
    }

    /** Rebuilds the local tables when the schema version changes. */
    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        db.execSQL("DROP TABLE IF EXISTS " + TABLE_SESSION);
        db.execSQL("DROP TABLE IF EXISTS " + TABLE_STATIONS);
        onCreate(db);
    }

    /** Replaces the cached node list with the rows just fetched from the API. */
    public void cacheStations(JSONArray stations) {
        SQLiteDatabase db = getWritableDatabase();
        db.beginTransaction();
        try {
            db.delete(TABLE_STATIONS, null, null);
            for (int i = 0; i < stations.length(); i++) {
                JSONObject station = stations.optJSONObject(i);
                if (station == null) {
                    continue;
                }
                ContentValues values = new ContentValues();
                values.put("id", station.optString("id"));
                values.put("name", station.optString("name"));
                values.put("location", station.optString("location"));
                values.put("latitude", station.optDouble("latitude"));
                values.put("longitude", station.optDouble("longitude"));
                values.put("capacity_kwh", station.optDouble("capacityKwh"));
                db.insertWithOnConflict(TABLE_STATIONS, null, values, SQLiteDatabase.CONFLICT_REPLACE);
            }
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }

    /** Returns the cached nodes as a JSON array in the same shape as the API. */
    public JSONArray readCachedStations() {
        JSONArray result = new JSONArray();
        try (Cursor cursor = getReadableDatabase()
                .query(TABLE_STATIONS, null, null, null, null, null, "name ASC")) {
            while (cursor.moveToNext()) {
                JSONObject station = new JSONObject();
                station.put("id", cursor.getString(cursor.getColumnIndexOrThrow("id")));
                station.put("name", cursor.getString(cursor.getColumnIndexOrThrow("name")));
                station.put("location", cursor.getString(cursor.getColumnIndexOrThrow("location")));
                station.put("latitude", cursor.getDouble(cursor.getColumnIndexOrThrow("latitude")));
                station.put("longitude", cursor.getDouble(cursor.getColumnIndexOrThrow("longitude")));
                station.put("capacityKwh", cursor.getDouble(cursor.getColumnIndexOrThrow("capacity_kwh")));
                result.put(station);
            }
        } catch (Exception ignored) {
            // A cache read failure is not fatal - the caller falls back to the API.
        }
        return result;
    }
}
