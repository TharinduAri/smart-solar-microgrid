package com.sliit.smartsolar.ui;

import android.content.Intent;
import android.os.Bundle;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.widget.EditText;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.textfield.MaterialAutoCompleteTextView;
import com.google.android.material.textfield.TextInputLayout;
import com.sliit.smartsolar.R;
import com.sliit.smartsolar.data.SessionManager;
import com.sliit.smartsolar.network.ApiClient;
import com.sliit.smartsolar.util.SystemBars;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.function.IntConsumer;

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

    private EditText nicInput;
    private ReservationAdapter adapter;
    private boolean isOperator;
    private int statusIndex;
    private int timeIndex;

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

        MaterialToolbar toolbar = findViewById(R.id.appBar);
        toolbar.setTitle(isOperator ? R.string.all_bookings : R.string.my_bookings);
        toolbar.setNavigationOnClickListener(v -> getOnBackPressedDispatcher().onBackPressed());

        statusIndex = indexOf(STATUS_VALUES, getIntent().getStringExtra(EXTRA_STATUS));
        timeIndex = indexOf(TIME_VALUES, getIntent().getStringExtra(EXTRA_UPCOMING));
        setUpDropdown(findViewById(R.id.inputStatus), R.array.status_filter, statusIndex,
                position -> statusIndex = position);
        setUpDropdown(findViewById(R.id.inputTime), R.array.time_filter, timeIndex,
                position -> timeIndex = position);

        // Grid Operators can also search by NIC, from the keyboard or the search icon.
        TextInputLayout nicLayout = findViewById(R.id.layoutNic);
        nicInput = findViewById(R.id.inputNic);
        nicLayout.setVisibility(isOperator ? View.VISIBLE : View.GONE);
        nicLayout.setEndIconOnClickListener(v -> loadReservations());
        nicInput.setOnEditorActionListener((v, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_SEARCH) {
                loadReservations();
                return true;
            }
            return false;
        });

        RecyclerView list = findViewById(R.id.listReservations);
        list.setLayoutManager(new LinearLayoutManager(this));
        adapter = new ReservationAdapter(isOperator, reservation -> {
            Intent intent = new Intent(this, BookingDetailActivity.class);
            intent.putExtra(BookingDetailActivity.EXTRA_ID, reservation.optString("id"));
            startActivity(intent);
        });
        list.setAdapter(adapter);
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

        String status = STATUS_VALUES[statusIndex];
        String upcoming = TIME_VALUES[timeIndex];
        String nic = nicInput.getText() == null ? "" : nicInput.getText().toString().trim();

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

    /** Shows the bookings as cards, or the empty message when nothing matches. */
    private void render(String body) {
        List<JSONObject> rows = new ArrayList<>();
        try {
            JSONArray reservations = new JSONArray(body);
            for (int i = 0; i < reservations.length(); i++) {
                rows.add(reservations.getJSONObject(i));
            }
        } catch (Exception ex) {
            Toast.makeText(this, ex.getMessage(), Toast.LENGTH_LONG).show();
        }

        adapter.submit(rows);
        findViewById(R.id.textEmpty).setVisibility(rows.isEmpty() ? View.VISIBLE : View.GONE);
    }

    /** Shows the chosen option in a dropdown and searches again whenever the choice changes. */
    private void setUpDropdown(MaterialAutoCompleteTextView dropdown, int arrayId, int selected, IntConsumer onSelect) {
        dropdown.setText(getResources().getStringArray(arrayId)[selected], false);
        dropdown.setOnItemClickListener((parent, view, position, id) -> {
            onSelect.accept(position);
            loadReservations();
        });
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
