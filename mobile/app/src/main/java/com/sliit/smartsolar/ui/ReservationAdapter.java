package com.sliit.smartsolar.ui;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.sliit.smartsolar.R;
import com.sliit.smartsolar.util.Format;
import com.sliit.smartsolar.util.Tones;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Smart Solar Microgrid Trading System - Android Client.
 *
 * Shows each booking from /api/reservations as a card: the node, a coloured
 * status label, the time and energy, and the prosumer for grid operators - the
 * same columns as the web Reservations table.
 */
public class ReservationAdapter extends RecyclerView.Adapter<ReservationAdapter.Holder> {

    /** Called when a booking card is tapped. */
    public interface OnBookingClick {
        void onClick(JSONObject reservation);
    }

    private final List<JSONObject> reservations = new ArrayList<>();
    private final boolean showProsumer;
    private final OnBookingClick onClick;

    public ReservationAdapter(boolean showProsumer, OnBookingClick onClick) {
        this.showProsumer = showProsumer;
        this.onClick = onClick;
    }

    /** Replaces the list with the bookings just returned by the API. */
    public void submit(List<JSONObject> rows) {
        reservations.clear();
        reservations.addAll(rows);
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public Holder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_reservation, parent, false);
        return new Holder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull Holder holder, int position) {
        JSONObject r = reservations.get(position);
        Context context = holder.itemView.getContext();

        holder.station.setText(r.optString("stationName"));
        Tones.statusLabel(holder.status, r.optString("status"));
        holder.timeEnergy.setText(context.getString(R.string.time_and_energy,
                Format.dateTime(r.optString("reservationTime")),
                Format.energy(r.optDouble("energyKwh"))));

        holder.prosumer.setVisibility(showProsumer ? View.VISIBLE : View.GONE);
        if (showProsumer) {
            holder.prosumer.setText(context.getString(R.string.prosumer_and_nic,
                    r.optString("prosumerName"), r.optString("prosumerNic")));
        }

        holder.itemView.setOnClickListener(v -> onClick.onClick(r));
    }

    @Override
    public int getItemCount() {
        return reservations.size();
    }

    /** The views of one booking card. */
    static class Holder extends RecyclerView.ViewHolder {
        final TextView station;
        final TextView status;
        final TextView timeEnergy;
        final TextView prosumer;

        Holder(View view) {
            super(view);
            station = view.findViewById(R.id.textStation);
            status = view.findViewById(R.id.textStatus);
            timeEnergy = view.findViewById(R.id.textTimeEnergy);
            prosumer = view.findViewById(R.id.textProsumer);
        }
    }
}
