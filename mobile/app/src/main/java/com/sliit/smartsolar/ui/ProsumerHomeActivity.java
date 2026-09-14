package com.sliit.smartsolar.ui;

import android.content.Intent;
import android.os.Bundle;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.sliit.smartsolar.R;
import com.sliit.smartsolar.data.SessionManager;
import com.sliit.smartsolar.network.ApiClient;

import org.json.JSONObject;

/**
 * Smart Solar Microgrid Trading System - Android Client.
 *
 * Prosumer dashboard. Reads the live reservation counts from the Web API and
 * links through to the booking list, the node map and the profile actions.
 */
public class ProsumerHomeActivity extends AppCompatActivity {

    private SessionManager sessionManager;
    private JSONObject session;

    /** Loads the stored session and wires the dashboard navigation. */
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_prosumer_home);

        sessionManager = new SessionManager(this);
        session = sessionManager.load();
        if (session == null) {
            signOut();
            return;
        }

        ((TextView) findViewById(R.id.textWelcome))
                .setText(getString(R.string.welcome_user, session.optString("fullName")));

        findViewById(R.id.buttonMyBookings).setOnClickListener(
                v -> startActivity(new Intent(this, ReservationsActivity.class)));
        findViewById(R.id.buttonNearbyNodes).setOnClickListener(
                v -> startActivity(new Intent(this, StationMapActivity.class)));
        findViewById(R.id.buttonRequestDeactivation).setOnClickListener(v -> requestDeactivation());
        findViewById(R.id.buttonSignOut).setOnClickListener(v -> signOut());

        loadDashboard();
    }

    /** Pulls the pending and approved future counts for this prosumer. */
    private void loadDashboard() {
        String nic = session.optString("nic");
        ApiClient.get("/api/reservations/dashboard?nic=" + nic, new ApiClient.Callback() {
            @Override
            public void onSuccess(String response) {
                try {
                    JSONObject summary = new JSONObject(response);
                    ((TextView) findViewById(R.id.textPendingCount))
                            .setText(String.valueOf(summary.optInt("pendingReservations")));
                    ((TextView) findViewById(R.id.textApprovedCount))
                            .setText(String.valueOf(summary.optInt("approvedFutureReservations")));
                } catch (Exception ex) {
                    onError(ex.getMessage());
                }
            }

            @Override
            public void onError(String message) {
                Toast.makeText(ProsumerHomeActivity.this, message, Toast.LENGTH_LONG).show();
            }
        });
    }

    /** Raises an account deactivation request for a Backoffice officer to action. */
    private void requestDeactivation() {
        String nic = session.optString("nic");
        ApiClient.patch("/api/users/" + nic + "/request-deactivation", null, new ApiClient.Callback() {
            @Override
            public void onSuccess(String response) {
                Toast.makeText(ProsumerHomeActivity.this, R.string.deactivation_requested, Toast.LENGTH_LONG).show();
            }

            @Override
            public void onError(String message) {
                Toast.makeText(ProsumerHomeActivity.this, message, Toast.LENGTH_LONG).show();
            }
        });
    }

    /** Clears the SQLite session and returns to the login screen. */
    private void signOut() {
        sessionManager.clear();
        startActivity(new Intent(this, LoginActivity.class));
        finish();
    }
}
