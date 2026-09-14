package com.sliit.smartsolar.ui;

import android.content.Intent;
import android.os.Bundle;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.appcompat.app.AppCompatActivity;

import com.journeyapps.barcodescanner.ScanContract;
import com.journeyapps.barcodescanner.ScanOptions;
import com.sliit.smartsolar.R;
import com.sliit.smartsolar.data.SessionManager;
import com.sliit.smartsolar.network.ApiClient;

import org.json.JSONObject;

/**
 * Smart Solar Microgrid Trading System - Android Client.
 *
 * Grid Operator home screen. Scans the transaction QR code presented by a
 * prosumer, sends it to the Web API for verification and finalises the energy
 * transfer once the server confirms the booking.
 */
public class OperatorHomeActivity extends AppCompatActivity {

    private SessionManager sessionManager;

    // Registered launcher that opens the ZXing camera scanner.
    private final ActivityResultLauncher<ScanOptions> scanLauncher =
            registerForActivityResult(new ScanContract(), result -> {
                if (result.getContents() != null) {
                    verifyScannedCode(result.getContents());
                }
            });

    /** Wires the operator actions and shows the signed in operator name. */
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_operator_home);

        sessionManager = new SessionManager(this);
        JSONObject session = sessionManager.load();
        if (session == null) {
            signOut();
            return;
        }

        ((TextView) findViewById(R.id.textWelcome))
                .setText(getString(R.string.welcome_user, session.optString("fullName")));

        findViewById(R.id.buttonScanQr).setOnClickListener(v -> startScan());
        findViewById(R.id.buttonBookings).setOnClickListener(
                v -> startActivity(new Intent(this, ReservationsActivity.class)));
        findViewById(R.id.buttonNodeMap).setOnClickListener(
                v -> startActivity(new Intent(this, StationMapActivity.class)));
        findViewById(R.id.buttonSignOut).setOnClickListener(v -> signOut());
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
     * Sends the scanned payload to /api/reservations/verify-qr. The QR content is
     * the JSON the prosumer app generated: { reservationId, qrToken }.
     */
    private void verifyScannedCode(String contents) {
        try {
            JSONObject scanned = new JSONObject(contents);
            JSONObject body = new JSONObject();
            body.put("reservationId", scanned.optString("reservationId"));
            body.put("qrToken", scanned.optString("qrToken"));

            ApiClient.post("/api/reservations/verify-qr", body, new ApiClient.Callback() {
                @Override
                public void onSuccess(String response) {
                    Toast.makeText(OperatorHomeActivity.this, R.string.transfer_completed, Toast.LENGTH_LONG).show();
                }

                @Override
                public void onError(String message) {
                    Toast.makeText(OperatorHomeActivity.this, message, Toast.LENGTH_LONG).show();
                }
            });
        } catch (Exception ex) {
            Toast.makeText(this, R.string.invalid_qr, Toast.LENGTH_LONG).show();
        }
    }

    /** Clears the SQLite session and returns to the login screen. */
    private void signOut() {
        sessionManager.clear();
        startActivity(new Intent(this, LoginActivity.class));
        finish();
    }
}
