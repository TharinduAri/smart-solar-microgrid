package com.sliit.smartsolar.ui;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.sliit.smartsolar.R;
import com.sliit.smartsolar.data.SessionManager;
import com.sliit.smartsolar.network.ApiClient;
import com.sliit.smartsolar.util.Format;
import com.sliit.smartsolar.util.QrCodeGenerator;
import com.sliit.smartsolar.util.SystemBars;

import org.json.JSONObject;

/**
 * Smart Solar Microgrid Trading System - Android Client.
 *
 * One booking in detail. Prosumers see the transaction QR code once the booking
 * is approved, and can change or cancel it. Grid Operators can also approve a
 * pending booking or cancel one on a prosumer's behalf. The 12 hour notice rule
 * is checked by the Web API, which returns the reason when it refuses.
 */
public class BookingDetailActivity extends AppCompatActivity {

    public static final String EXTRA_ID = "reservationId";

    private String reservationId;
    private JSONObject reservation;
    private boolean isOperator;

    /** Reads the booking id and wires the action buttons. */
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_booking_detail);
        SystemBars.apply(this);

        JSONObject session = new SessionManager(this).load();
        if (session == null) {
            finish();
            return;
        }
        isOperator = !"Prosumer".equals(session.optString("role"));
        reservationId = getIntent().getStringExtra(EXTRA_ID);

        findViewById(R.id.buttonChange).setOnClickListener(v -> openChangeForm());
        findViewById(R.id.buttonCancel).setOnClickListener(v -> confirmCancel());
        findViewById(R.id.buttonApprove).setOnClickListener(v -> approve());
    }

    /** Reloads the booking each time the screen is shown, so it is never out of date. */
    @Override
    protected void onResume() {
        super.onResume();
        ApiClient.get("/api/reservations/" + reservationId, new ApiClient.Callback() {
            @Override
            public void onSuccess(String body) {
                try {
                    show(new JSONObject(body));
                } catch (Exception ex) {
                    onError(ex.getMessage());
                }
            }

            @Override
            public void onError(String message) {
                Toast.makeText(BookingDetailActivity.this, message, Toast.LENGTH_LONG).show();
            }
        });
    }

    /** Fills the screen and shows only the actions that fit the booking status. */
    private void show(JSONObject r) {
        reservation = r;
        String status = r.optString("status");
        boolean open = "Pending".equals(status) || "Approved".equals(status);

        ((TextView) findViewById(R.id.textStation)).setText(r.optString("stationName"));
        ((TextView) findViewById(R.id.textStatus)).setText(status);
        ((TextView) findViewById(R.id.textDetails)).setText(getString(R.string.booking_details,
                r.optString("prosumerName"),
                r.optString("prosumerNic"),
                Format.dateTime(r.optString("reservationTime")),
                r.optDouble("energyKwh"),
                r.optString("id")));

        findViewById(R.id.buttonChange).setVisibility(open ? View.VISIBLE : View.GONE);
        findViewById(R.id.buttonCancel).setVisibility(open ? View.VISIBLE : View.GONE);
        findViewById(R.id.textNotice).setVisibility(open ? View.VISIBLE : View.GONE);
        findViewById(R.id.buttonApprove).setVisibility(
                isOperator && "Pending".equals(status) ? View.VISIBLE : View.GONE);

        ImageView qrImage = findViewById(R.id.imageQr);
        String token = r.isNull("qrToken") ? "" : r.optString("qrToken");
        boolean showQr = !isOperator && "Approved".equals(status) && !token.isEmpty();
        qrImage.setVisibility(showQr ? View.VISIBLE : View.GONE);
        findViewById(R.id.textQrHint).setVisibility(showQr ? View.VISIBLE : View.GONE);
        if (showQr) {
            try {
                qrImage.setImageBitmap(QrCodeGenerator.createTransactionQr(r.optString("id"), token));
            } catch (Exception ex) {
                Toast.makeText(this, ex.getMessage(), Toast.LENGTH_LONG).show();
            }
        }
    }

    /** Opens the booking form with this booking's details filled in. */
    private void openChangeForm() {
        if (reservation == null) {
            return;
        }
        Intent intent = new Intent(this, BookingFormActivity.class);
        intent.putExtra(BookingFormActivity.EXTRA_RESERVATION_ID, reservation.optString("id"));
        intent.putExtra(BookingFormActivity.EXTRA_STATION_ID, reservation.optString("stationId"));
        intent.putExtra(BookingFormActivity.EXTRA_STATION_NAME, reservation.optString("stationName"));
        intent.putExtra(BookingFormActivity.EXTRA_SLOT_ID, reservation.optString("slotId"));
        intent.putExtra(BookingFormActivity.EXTRA_TIME, reservation.optString("reservationTime"));
        intent.putExtra(BookingFormActivity.EXTRA_ENERGY, reservation.optDouble("energyKwh"));
        startActivity(intent);
    }

    /** Asks before cancelling, then cancels through the API and shows the summary. */
    private void confirmCancel() {
        new AlertDialog.Builder(this)
                .setTitle(R.string.cancel_booking_title)
                .setMessage(R.string.cancel_booking_message)
                .setPositiveButton(R.string.cancel_booking, (dialog, which) -> cancel())
                .setNegativeButton(R.string.keep_booking, null)
                .show();
    }

    /** Sends the cancellation; the API refuses it with less than 12 hours to go. */
    private void cancel() {
        ApiClient.patch("/api/reservations/" + reservationId + "/cancel", null, new ApiClient.Callback() {
            @Override
            public void onSuccess(String body) {
                SummaryActivity.open(BookingDetailActivity.this, getString(R.string.summary_cancelled), body);
                finish();
            }

            @Override
            public void onError(String message) {
                Toast.makeText(BookingDetailActivity.this, message, Toast.LENGTH_LONG).show();
            }
        });
    }

    /** Operator approves a pending booking; the API issues the QR token. */
    private void approve() {
        ApiClient.patch("/api/reservations/" + reservationId + "/approve", null, new ApiClient.Callback() {
            @Override
            public void onSuccess(String body) {
                Toast.makeText(BookingDetailActivity.this, R.string.booking_approved, Toast.LENGTH_SHORT).show();
                try {
                    show(new JSONObject(body));
                } catch (Exception ignored) {
                    // The next reload in onResume shows the new status anyway.
                }
            }

            @Override
            public void onError(String message) {
                Toast.makeText(BookingDetailActivity.this, message, Toast.LENGTH_LONG).show();
            }
        });
    }
}
