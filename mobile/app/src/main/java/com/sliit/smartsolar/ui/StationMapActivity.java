package com.sliit.smartsolar.ui;

import android.os.Bundle;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.gms.maps.CameraUpdateFactory;
import com.google.android.gms.maps.GoogleMap;
import com.google.android.gms.maps.OnMapReadyCallback;
import com.google.android.gms.maps.SupportMapFragment;
import com.google.android.gms.maps.model.LatLng;
import com.google.android.gms.maps.model.MarkerOptions;
import com.sliit.smartsolar.R;
import com.sliit.smartsolar.data.DatabaseHelper;
import com.sliit.smartsolar.network.ApiClient;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Smart Solar Microgrid Trading System - Android Client.
 *
 * Plots the active microgrid nodes on a Google Map using the latitude and
 * longitude stored on the server. The rows are cached in SQLite so the map can
 * still be drawn from the last known data when the API is unreachable.
 */
public class StationMapActivity extends AppCompatActivity implements OnMapReadyCallback {

    private GoogleMap map;
    private DatabaseHelper databaseHelper;

    /** Attaches the map fragment and requests the map callback. */
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_station_map);

        databaseHelper = new DatabaseHelper(this);

        SupportMapFragment fragment =
                (SupportMapFragment) getSupportFragmentManager().findFragmentById(R.id.mapFragment);
        if (fragment != null) {
            fragment.getMapAsync(this);
        }
    }

    /** Called once the map is ready - loads the node list from the API. */
    @Override
    public void onMapReady(GoogleMap googleMap) {
        map = googleMap;
        loadStations();
    }

    /** Fetches the active nodes, caches them locally and draws the markers. */
    private void loadStations() {
        ApiClient.get("/api/stations?isActive=true", new ApiClient.Callback() {
            @Override
            public void onSuccess(String response) {
                try {
                    JSONArray stations = new JSONArray(response);
                    databaseHelper.cacheStations(stations);
                    drawMarkers(stations);
                } catch (Exception ex) {
                    onError(ex.getMessage());
                }
            }

            @Override
            public void onError(String message) {
                Toast.makeText(StationMapActivity.this, message, Toast.LENGTH_LONG).show();
                drawMarkers(databaseHelper.readCachedStations());
            }
        });
    }

    /** Adds one marker per node and centres the camera on the first one. */
    private void drawMarkers(JSONArray stations) {
        if (map == null) {
            return;
        }
        map.clear();

        for (int i = 0; i < stations.length(); i++) {
            JSONObject station = stations.optJSONObject(i);
            if (station == null) {
                continue;
            }
            LatLng position = new LatLng(station.optDouble("latitude"), station.optDouble("longitude"));
            map.addMarker(new MarkerOptions()
                    .position(position)
                    .title(station.optString("name"))
                    .snippet(station.optString("location") + " - " + station.optDouble("capacityKwh") + " kW/h"));

            if (i == 0) {
                map.moveCamera(CameraUpdateFactory.newLatLngZoom(position, 11f));
            }
        }
    }
}
