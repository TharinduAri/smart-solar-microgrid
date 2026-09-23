package com.sliit.smartsolar.ui;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.EditText;
import android.widget.ListView;
import android.widget.SimpleAdapter;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.sliit.smartsolar.R;
import com.sliit.smartsolar.data.SessionManager;
import com.sliit.smartsolar.network.ApiClient;
import com.sliit.smartsolar.util.Format;
import com.sliit.smartsolar.util.SystemBars;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Smart Solar Microgrid Trading System - Android Client.
 *
 * Booking list with search filters: status (pending, approved, ...) and time
 * (upcoming bookings or past history). Grid Operators can also search by NIC.
 * Every search is run by the Web API; tapping a booking opens its details.
 */
public class ReservationsActivity extends AppCompatActivity {

    public static final String EXTRA_STATUS = "status";
    public static final String EXTRA_UPCOMING = "upcoming";

    // What the API expects for each dropdown option, in the same order as the labels.
    private static final String[] STATUS_VALUES = {"", "Pending", "Approved", "Completed", "Cancelled"};
    private static final String[] TIME_VALUES = {"", "true", "false"};

    private final List<String> reservationIds = new ArrayList<>();

    private Spinner statusSpinner;
    private Spinner timeSpinner;
    private EditText nicInput;
    private ListView listView;
    private boolean isOperator;

    /** Sets up the filters, applying any filter passed in from the home screen. */
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_reservations);
        SystemBars.apply(this);

        JSONObject session = new SessionManager(this).load();
        if (session == null) {
            finish();
            return;
        }
        isOperator = !"Prosumer".equals(session.optString("role"));

        statusSpinner = findViewById(R.id.spinnerStatus);
        timeSpinner = findViewById(R.id.spinnerTime);
        nicInput = findViewById(R.id.inputNic);
        listView = findViewById(R.id.listReservations);

        setItems(statusSpinner, R.array.status_filter);
        setItems(timeSpinner, R.array.time_filter);
        statusSpinner.setSelection(indexOf(STATUS_VALUES, getIntent().getStringExtra(EXTRA_STATUS)));
        timeSpinner.setSelection(indexOf(TIME_VALUES, getIntent().getStringExtra(EXTRA_UPCOMING)));
        nicInput.setVisibility(isOperator ? View.VISIBLE : View.GONE);
        ((TextView) findViewById(R.id.textTitle)).setText(isOperator ? R.string.all_bookings : R.string.my_bookings);

        findViewById(R.id.buttonSearch).setOnClickListener(v -> loadReservations());
        listView.setOnItemClickListener((parent, view, position, id) -> {
            Intent intent = new Intent(this, BookingDetailActivity.class);
            intent.putExtra(BookingDetailActivity.EXTRA_ID, reservationIds.get(position));
            startActivity(intent);
        });
    }

    /** Reloads the list whenever the screen is shown, so changes made elsewhere appear. */
    @Override
    protected void onResume() {
        super.onResume();
        loadReservations();
    }

    /** Builds the search from the filters and asks the API for matching bookings. */
    private void loadReservations() {
        StringBuilder path = new StringBuilder("/api/reservations?");

        String status = STATUS_VALUES[statusSpinner.getSelectedItemPosition()];
        String upcoming = TIME_VALUES[timeSpinner.getSelectedItemPosition()];
        String nic = nicInput.getText().toString().trim();

        if (!status.isEmpty()) {
            path.append("status=").append(status).append("&");
        }
        if (!upcoming.isEmpty()) {
            path.append("upcoming=").append(upcoming).append("&");
        }
        if (isOperator && !nic.isEmpty()) {
            path.append("nic=").append(nic);
        }

        ApiClient.get(path.toString(), new ApiClient.Callback() {
            @Override
            public void onSuccess(String body) {
                render(body);
            }

            @Override
            public void onError(String message) {
                Toast.makeText(ReservationsActivity.this, message, Toast.LENGTH_LONG).show();
            }
        });
    }

    /** Shows each booking as two lines: node and status, then time and energy. */
    private void render(String body) {
        List<Map<String, String>> rows = new ArrayList<>();
        reservationIds.clear();

        try {
            JSONArray reservations = new JSONArray(body);
            for (int i = 0; i < reservations.length(); i++) {
                JSONObject r = reservations.getJSONObject(i);
                reservationIds.add(r.optString("id"));

                Map<String, String> row = new HashMap<>();
                row.put("title", r.optString("stationName") + "  ·  " + r.optString("status"));
                String line = Format.dateTime(r.optString("reservationTime")) + "  ·  " + r.optDouble("energyKwh") + " kWh";
                if (isOperator) {
                    line += "  ·  " + r.optString("prosumerName");
                }
                row.put("subtitle", line);
                rows.add(row);
            }
        } catch (Exception ex) {
            Toast.makeText(this, ex.getMessage(), Toast.LENGTH_LONG).show();
        }

        listView.setAdapter(new SimpleAdapter(this, rows, android.R.layout.simple_list_item_2,
                new String[]{"title", "subtitle"}, new int[]{android.R.id.text1, android.R.id.text2}));
        findViewById(R.id.textEmpty).setVisibility(rows.isEmpty() ? View.VISIBLE : View.GONE);
    }

    /** Puts a list of labels from the resources into a dropdown. */
    private void setItems(Spinner spinner, int arrayId) {
        ArrayAdapter<CharSequence> adapter =
                ArrayAdapter.createFromResource(this, arrayId, android.R.layout.simple_spinner_item);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinner.setAdapter(adapter);
    }

    /** Finds which dropdown option matches a value passed in, defaulting to the first. */
    private static int indexOf(String[] values, String value) {
        for (int i = 0; i < values.length; i++) {
            if (values[i].equals(value)) {
                return i;
            }
        }
        return 0;
    }
}
