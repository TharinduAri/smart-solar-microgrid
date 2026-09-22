package com.sliit.smartsolar.ui;

import android.os.Bundle;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
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
import java.util.Collections;
import java.util.List;

/**
 * Smart Solar Microgrid Trading System - Android Client.
 *
 * One form for both a new booking and a change to an existing one. The user
 * picks a microgrid node, a free time slot and the energy to trade. The 7 day
 * window, the 12 hour notice rule and the free bay count are all checked by the
 * Web API - the form only shows its answer.
 */
public class BookingFormActivity extends AppCompatActivity {

    public static final String EXTRA_RESERVATION_ID = "reservationId";
    public static final String EXTRA_STATION_ID = "stationId";
    public static final String EXTRA_STATION_NAME = "stationName";
    public static final String EXTRA_SLOT_ID = "slotId";
    public static final String EXTRA_TIME = "reservationTime";
    public static final String EXTRA_ENERGY = "energyKwh";

    private final List<String> stationIds = new ArrayList<>();
    private final List<String> slotIds = new ArrayList<>();

    private Spinner stationSpinner;
    private Spinner slotSpinner;
    private EditText energyInput;
    private Button saveButton;
    private String reservationId;
    private JSONObject session;

    /** Sets the form up for a new booking or for changing an existing one. */
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_booking_form);
        SystemBars.apply(this);

        session = new SessionManager(this).load();
        if (session == null) {
            finish();
            return;
        }

        stationSpinner = findViewById(R.id.spinnerStation);
        slotSpinner = findViewById(R.id.spinnerSlot);
        energyInput = findViewById(R.id.inputEnergy);
        saveButton = findViewById(R.id.buttonSave);
        reservationId = getIntent().getStringExtra(EXTRA_RESERVATION_ID);

        if (reservationId != null) {
            // Changing a booking: the node stays the same, only the slot and energy can change.
            ((TextView) findViewById(R.id.textTitle)).setText(R.string.change_booking);
            String stationId = getIntent().getStringExtra(EXTRA_STATION_ID);
            stationIds.add(stationId);
            setItems(stationSpinner, Collections.singletonList(getIntent().getStringExtra(EXTRA_STATION_NAME)));
            stationSpinner.setEnabled(false);
            energyInput.setText(String.valueOf(getIntent().getDoubleExtra(EXTRA_ENERGY, 0)));
            loadSlots(stationId);
        } else {
            loadStations();
        }

        saveButton.setOnClickListener(v -> save());
    }

    /** Loads the active nodes and reloads the slots whenever a different node is picked. */
    private void loadStations() {
        ApiClient.get("/api/stations?isActive=true", new ApiClient.Callback() {
            @Override
            public void onSuccess(String body) {
                try {
                    JSONArray stations = new JSONArray(body);
                    List<String> names = new ArrayList<>();
                    for (int i = 0; i < stations.length(); i++) {
                        JSONObject s = stations.getJSONObject(i);
                        stationIds.add(s.optString("id"));
                        names.add(s.optString("name") + " (" + s.optString("location") + ")");
                    }
                    setItems(stationSpinner, names);
                    stationSpinner.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
                        @Override
                        public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                            loadSlots(stationIds.get(position));
                        }

                        @Override
                        public void onNothingSelected(AdapterView<?> parent) {
                        }
                    });
                } catch (Exception ex) {
                    onError(ex.getMessage());
                }
            }

            @Override
            public void onError(String message) {
                Toast.makeText(BookingFormActivity.this, message, Toast.LENGTH_LONG).show();
            }
        });
    }

    /** Loads the free time slots of a node. When changing a booking, its current slot is listed first. */
    private void loadSlots(String stationId) {
        ApiClient.get("/api/stations/" + stationId + "/slots?availableOnly=true", new ApiClient.Callback() {
            @Override
            public void onSuccess(String body) {
                try {
                    JSONArray slots = new JSONArray(body);
                    List<String> labels = new ArrayList<>();
                    slotIds.clear();

                    String currentSlotId = getIntent().getStringExtra(EXTRA_SLOT_ID);
                    if (reservationId != null) {
                        slotIds.add(currentSlotId);
                        labels.add(getString(R.string.current_slot,
                                Format.dateTime(getIntent().getStringExtra(EXTRA_TIME))));
                    }

                    for (int i = 0; i < slots.length(); i++) {
                        JSONObject slot = slots.getJSONObject(i);
                        if (slot.optString("id").equals(currentSlotId)) {
                            continue;
                        }
                        slotIds.add(slot.optString("id"));
                        labels.add(getString(R.string.slot_label,
                                Format.window(slot.optString("startTime"), slot.optString("endTime")),
                                slot.optInt("availableSlots")));
                    }

                    setItems(slotSpinner, labels);
                    findViewById(R.id.textNoSlots).setVisibility(labels.isEmpty() ? View.VISIBLE : View.GONE);
                } catch (Exception ex) {
                    onError(ex.getMessage());
                }
            }

            @Override
            public void onError(String message) {
                Toast.makeText(BookingFormActivity.this, message, Toast.LENGTH_LONG).show();
            }
        });
    }

    /** Sends the booking to the API and opens the summary page when it is accepted. */
    private void save() {
        int slotPosition = slotSpinner.getSelectedItemPosition();
        String energy = energyInput.getText().toString().trim();

        if (slotPosition < 0 || slotPosition >= slotIds.size() || energy.isEmpty()) {
            Toast.makeText(this, R.string.error_fill_all_fields, Toast.LENGTH_SHORT).show();
            return;
        }

        try {
            JSONObject body = new JSONObject();
            body.put("slotId", slotIds.get(slotPosition));
            body.put("energyKwh", Double.parseDouble(energy));

            ApiClient.Callback callback = new ApiClient.Callback() {
                @Override
                public void onSuccess(String response) {
                    String title = getString(reservationId == null ? R.string.summary_created : R.string.summary_updated);
                    SummaryActivity.open(BookingFormActivity.this, title, response);
                    finish();
                }

                @Override
                public void onError(String message) {
                    saveButton.setEnabled(true);
                    Toast.makeText(BookingFormActivity.this, message, Toast.LENGTH_LONG).show();
                }
            };

            saveButton.setEnabled(false);
            if (reservationId == null) {
                body.put("prosumerNic", session.optString("nic"));
                body.put("stationId", stationIds.get(stationSpinner.getSelectedItemPosition()));
                ApiClient.post("/api/reservations", body, callback);
            } else {
                ApiClient.put("/api/reservations/" + reservationId, body, callback);
            }
        } catch (Exception ex) {
            saveButton.setEnabled(true);
            Toast.makeText(this, R.string.error_fill_all_fields, Toast.LENGTH_SHORT).show();
        }
    }

    /** Puts a list of labels into a dropdown. */
    private void setItems(Spinner spinner, List<String> items) {
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, items);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinner.setAdapter(adapter);
    }
}
