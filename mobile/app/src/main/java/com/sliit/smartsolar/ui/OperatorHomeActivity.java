package com.sliit.smartsolar.ui;

import android.content.Intent;
import android.os.Bundle;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.journeyapps.barcodescanner.ScanContract;
import com.journeyapps.barcodescanner.ScanOptions;
import com.sliit.smartsolar.R;
import com.sliit.smartsolar.data.SessionManager;
import com.sliit.smartsolar.network.ApiClient;
import com.sliit.smartsolar.util.Format;
import com.sliit.smartsolar.util.SystemBars;

import org.json.JSONObject;

/**
 * Smart Solar Microgrid Trading System - Android Client.
 *
 * Grid Operator home screen. Shows the live booking counts, and scans the
 * transaction QR code a prosumer presents: the booking is fetched from the Web
 * API and shown to the operator, and only when the operator confirms is the QR
 * token sent back to the API to verify it and finalise the energy transfer.
 */
public class OperatorHomeActivity extends AppCompatActivity {

    private SessionManager sessionManager;

    // Registered launcher that opens the ZXing camera scanner.
    private final ActivityResultLauncher<ScanOptions> scanLauncher =
            registerForActivityResult(new ScanContract(), result -> {
                if (result.getContents() != null) {
                    checkScannedCode(result.getContents());
                }
            });

    /** Wires the operator actions and shows the signed in operator name. */
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_operator_home);
        SystemBars.apply(this);

        sessionManager = new SessionManager(this);
        JSONObject session = sessionManager.load();
        if (session == null) {
            signOut();
            return;
        }

        ((TextView) findViewById(R.id.textWelcome))
                .setText(getString(R.string.welcome_user, session.optString("fullName")));

        findViewById(R.id.buttonScanQr).setOnClickListener(v -> startScan());
        findViewById(R.id.buttonBookings).setOnClickListener(v -> openBookings(null, null));
        findViewById(R.id.cardPending).setOnClickListener(v -> openBookings("Pending", "true"));
        findViewById(R.id.cardApproved).setOnClickListener(v -> openBookings("Approved", "true"));
        findViewById(R.id.buttonNodeMap).setOnClickListener(
                v -> startActivity(new Intent(this, StationMapActivity.class)));
        findViewById(R.id.buttonSignOut).setOnClickListener(v -> signOut());
    }

    /** Refreshes the counts every time the operator comes back to this screen. */
    @Override
    protected void onResume() {
        super.onResume();
        ApiClient.get("/api/reservations/dashboard", new ApiClient.Callback() {
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
                Toast.makeText(OperatorHomeActivity.this, message, Toast.LENGTH_LONG).show();
            }
        });
    }

    /** Opens the camera scanner configured for QR codes only. */
    private void startScan() {
        ScanOptions options = new ScanOptions();
        options.setDesiredBarcodeFormats(ScanOptions.QR_CODE);
        options.setPrompt(getString(R.string.scan_prompt));
        options.setBeepEnabled(false);
        options.setOrientationLocked(false);
        scanLauncher.launch(options);
    }

    /**
     * Reads the scanned code - the JSON { reservationId, qrToken } made by the
     * prosumer app - and fetches that booking from the server to show the operator.
     */
    private void checkScannedCode(String contents) {
        String reservationId;
        String qrToken;
        try {
            JSONObject scanned = new JSONObject(contents);
            reservationId = scanned.getString("reservationId");
            qrToken = scanned.getString("qrToken");
        } catch (Exception ex) {
            Toast.makeText(this, R.string.invalid_qr, Toast.LENGTH_LONG).show();
            return;
        }

        ApiClient.get("/api/reservations/" + reservationId, new ApiClient.Callback() {
            @Override
            public void onSuccess(String body) {
                try {
                    confirmTransfer(new JSONObject(body), qrToken);
                } catch (Exception ex) {
                    onError(ex.getMessage());
                }
            }

            @Override
            public void onError(String message) {
                Toast.makeText(OperatorHomeActivity.this, message, Toast.LENGTH_LONG).show();
            }
        });
    }

    /** Shows the booking from the server and lets the operator complete the transfer. */
    private void confirmTransfer(JSONObject r, String qrToken) {
        String details = getString(R.string.scan_details,
                r.optString("prosumerName"),
                r.optString("prosumerNic"),
                r.optString("stationName"),
                Format.dateTime(r.optString("reservationTime")),
                r.optDouble("energyKwh"),
                r.optString("status"));

        new AlertDialog.Builder(this)
                .setTitle(R.string.check_booking)
                .setMessage(details)
                .setPositiveButton(R.string.complete_transfer, (dialog, which) -> completeTransfer(r.optString("id"), qrToken))
                .setNegativeButton(R.string.close, null)
                .show();
    }

    /** Sends the QR token to the API, which verifies it and marks the booking completed. */
    private void completeTransfer(String reservationId, String qrToken) {
        try {
            JSONObject body = new JSONObject();
            body.put("reservationId", reservationId);
            body.put("qrToken", qrToken);

            ApiClient.post("/api/reservations/verify-qr", body, new ApiClient.Callback() {
                @Override
                public void onSuccess(String response) {
                    SummaryActivity.open(OperatorHomeActivity.this, getString(R.string.transfer_completed), response);
                }

                @Override
                public void onError(String message) {
                    Toast.makeText(OperatorHomeActivity.this, message, Toast.LENGTH_LONG).show();
                }
            });
        } catch (Exception ex) {
            Toast.makeText(this, ex.getMessage(), Toast.LENGTH_LONG).show();
        }
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
