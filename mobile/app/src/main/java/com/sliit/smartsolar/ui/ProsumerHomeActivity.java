package com.sliit.smartsolar.ui;

import android.content.Intent;
import android.os.Bundle;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.sliit.smartsolar.R;
import com.sliit.smartsolar.data.SessionManager;
import com.sliit.smartsolar.network.ApiClient;
import com.sliit.smartsolar.util.SystemBars;

import org.json.JSONObject;

/**
 * Smart Solar Microgrid Trading System - Android Client.
 *
 * Prosumer dashboard. Shows the live counts of pending and approved upcoming
 * reservations from the Web API, and links to booking, the booking list, the
 * node map and the profile screen.
 */
public class ProsumerHomeActivity extends AppCompatActivity {

    private SessionManager sessionManager;
    private JSONObject session;

    /** Checks the stored session and wires the dashboard buttons. */
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_prosumer_home);
        SystemBars.apply(this);

        sessionManager = new SessionManager(this);
        if (sessionManager.load() == null) {
            signOut();
            return;
        }

        findViewById(R.id.buttonNewBooking).setOnClickListener(
                v -> startActivity(new Intent(this, BookingFormActivity.class)));
        findViewById(R.id.buttonMyBookings).setOnClickListener(v -> openBookings(null, null));
        findViewById(R.id.cardPending).setOnClickListener(v -> openBookings("Pending", "true"));
        findViewById(R.id.cardApproved).setOnClickListener(v -> openBookings("Approved", "true"));
        findViewById(R.id.buttonNearbyNodes).setOnClickListener(
                v -> startActivity(new Intent(this, StationMapActivity.class)));
        findViewById(R.id.buttonProfile).setOnClickListener(
                v -> startActivity(new Intent(this, ProfileActivity.class)));
        findViewById(R.id.buttonSignOut).setOnClickListener(v -> signOut());
    }

    /** Refreshes the name and counts every time the user comes back to this screen. */
    @Override
    protected void onResume() {
        super.onResume();
        session = sessionManager.load();
        if (session == null) {
            signOut();
            return;
        }
        ((TextView) findViewById(R.id.textWelcome))
                .setText(getString(R.string.welcome_user, session.optString("fullName")));
        loadDashboard();
    }

    /** Pulls the pending and approved upcoming counts for this prosumer. */
    private void loadDashboard() {
        ApiClient.get("/api/reservations/dashboard?nic=" + session.optString("nic"), new ApiClient.Callback() {
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

    /** Opens the booking list, optionally already filtered. */
    private void openBookings(String status, String upcoming) {
        Intent intent = new Intent(this, ReservationsActivity.class);
        intent.putExtra(ReservationsActivity.EXTRA_STATUS, status);
        intent.putExtra(ReservationsActivity.EXTRA_UPCOMING, upcoming);
        startActivity(intent);
    }

    /** Clears the SQLite session and returns to the login screen. */
    private void signOut() {
        sessionManager.clear();
        startActivity(new Intent(this, LoginActivity.class));
        finish();
    }
}
