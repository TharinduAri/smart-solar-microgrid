package com.sliit.smartsolar.ui;

import android.os.Bundle;
import android.widget.ArrayAdapter;
import android.widget.EditText;
import android.widget.ListView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.sliit.smartsolar.R;
import com.sliit.smartsolar.data.SessionManager;
import com.sliit.smartsolar.network.ApiClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Smart Solar Microgrid Trading System - Android Client.
 *
 * Booking list screen. Shows current, pending and historic reservations read
 * live from the Web API, with a status filter used as the search criterion.
 */
public class ReservationsActivity extends AppCompatActivity {

    private ListView listView;
    private EditText statusFilter;
    private JSONObject session;

    /** Binds the list and triggers the first load. */
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_reservations);

        session = new SessionManager(this).load();
        listView = findViewById(R.id.listReservations);
        statusFilter = findViewById(R.id.inputStatusFilter);

        findViewById(R.id.buttonSearch).setOnClickListener(v -> loadReservations());
        loadReservations();
    }

    /**
     * Builds the query string and calls /api/reservations. Prosumers are scoped to
     * their own NIC, while a Grid Operator sees every booking.
     */
    private void loadReservations() {
        StringBuilder path = new StringBuilder("/api/reservations?");

        if (session != null && "Prosumer".equals(session.optString("role"))) {
            path.append("nic=").append(session.optString("nic")).append("&");
        }

        String status = statusFilter.getText().toString().trim();
        if (!status.isEmpty()) {
            path.append("status=").append(status);
        }

        ApiClient.get(path.toString(), new ApiClient.Callback() {
            @Override
            public void onSuccess(String response) {
                render(response);
            }

            @Override
            public void onError(String message) {
                Toast.makeText(ReservationsActivity.this, message, Toast.LENGTH_LONG).show();
            }
        });
    }

    /** Turns the API rows into simple list entries. */
    private void render(String response) {
        List<String> rows = new ArrayList<>();
        try {
            JSONArray reservations = new JSONArray(response);
            for (int i = 0; i < reservations.length(); i++) {
                JSONObject r = reservations.getJSONObject(i);
                rows.add(r.optString("stationName")
                        + "\n" + r.optString("reservationTime")
                        + "  -  " + r.optDouble("energyKwh") + " kWh"
                        + "  [" + r.optString("status") + "]");
            }
        } catch (Exception ex) {
            Toast.makeText(this, ex.getMessage(), Toast.LENGTH_LONG).show();
        }

        listView.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_list_item_1, rows));
    }

    // TODO: open a detail screen on row tap that creates, updates or cancels the
    // booking and shows the generated transaction QR code once it is approved.
}
