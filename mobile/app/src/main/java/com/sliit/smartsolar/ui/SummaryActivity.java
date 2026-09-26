package com.sliit.smartsolar.ui;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.widget.TextView;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;

import com.sliit.smartsolar.R;
import com.sliit.smartsolar.data.SessionManager;
import com.sliit.smartsolar.util.Format;
import com.sliit.smartsolar.util.SystemBars;
import com.sliit.smartsolar.util.Tones;

import org.json.JSONObject;

/**
 * Smart Solar Microgrid Trading System - Android Client.
 *
 * Summary page shown after every booking action - create, update, cancel and
 * the operator's completed transfer. It displays the booking exactly as the
 * Web API returned it, then sends the user back to their home screen.
 */
public class SummaryActivity extends AppCompatActivity {

    private static final String EXTRA_TITLE = "title";
    private static final String EXTRA_RESERVATION = "reservation";

    /** Opens the summary for the booking JSON returned by the API. */
    public static void open(Activity from, String title, String reservationJson) {
        Intent intent = new Intent(from, SummaryActivity.class);
        intent.putExtra(EXTRA_TITLE, title);
        intent.putExtra(EXTRA_RESERVATION, reservationJson);
        from.startActivity(intent);
    }

    /** Fills in the result and wires the home button and the back button. */
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_summary);
        SystemBars.apply(this);

        ((TextView) findViewById(R.id.textTitle)).setText(getIntent().getStringExtra(EXTRA_TITLE));

        try {
            JSONObject r = new JSONObject(getIntent().getStringExtra(EXTRA_RESERVATION));
            String status = r.optString("status");
            ((TextView) findViewById(R.id.textMessage)).setText(messageFor(status));
            Tones.statusIcon(findViewById(R.id.imageResult), status);
            Tones.statusLabel(findViewById(R.id.textStatus), status);
            ((TextView) findViewById(R.id.textNode)).setText(r.optString("stationName"));
            ((TextView) findViewById(R.id.textProsumer)).setText(
                    getString(R.string.prosumer_value, r.optString("prosumerName"), r.optString("prosumerNic")));
            ((TextView) findViewById(R.id.textTime)).setText(Format.dateTime(r.optString("reservationTime")));
            ((TextView) findViewById(R.id.textEnergy)).setText(Format.energy(r.optDouble("energyKwh")));
            ((TextView) findViewById(R.id.textReference)).setText(r.optString("id"));
        } catch (Exception ex) {
            ((TextView) findViewById(R.id.textMessage)).setText(ex.getMessage());
        }

        findViewById(R.id.buttonHome).setOnClickListener(v -> goHome());
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                goHome();
            }
        });
    }

    /** Picks the line that tells the user what happens next. */
    private String messageFor(String status) {
        switch (status) {
            case "Pending":
                return getString(R.string.next_pending);
            case "Approved":
                return getString(R.string.next_approved);
            case "Cancelled":
                return getString(R.string.next_cancelled);
            default:
                return getString(R.string.next_completed);
        }
    }

    /** Returns to the home screen for the user's role, closing the screens on top of it. */
    private void goHome() {
        JSONObject session = new SessionManager(this).load();
        boolean prosumer = session != null && "Prosumer".equals(session.optString("role"));
        Intent intent = new Intent(this, prosumer ? ProsumerHomeActivity.class : OperatorHomeActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(intent);
        finish();
    }
}
