import React, { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Stack, Autocomplete, MenuItem
} from "@mui/material";

// Dummy users list
const users = [
  { id: 1, name: "John Doe", email: "john@acme.com" },
  { id: 2, name: "Jane Smith", email: "jane@acme.com" },
  // ...get from API in real app
];

const regions = ["South Asia", "North", "West", "East"];
const units = ["Amount", "Units", "Orders"];
const plans = ["Imaging", "Ultrasound", "Other Plan"];

export default function CreateQuotaDialog({ open, onClose, onSave }) {
  const [form, setForm] = useState({
    user: null,
    startDate: "",
    endDate: "",
    goal: "",
    unit: "",
    region: "",
    plan: "",
    description: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleUserChange = (event, value) => {
    setForm((prev) => ({ ...prev, user: value }));
  };

  const handleSubmit = () => {
    if (!form.user || !form.startDate || !form.endDate || !form.goal || !form.unit) {
      alert("Please fill all required fields.");
      return;
    }
    onSave(form);
    onClose();
    setForm({ user: null, startDate: "", endDate: "", goal: "", unit: "", region: "", plan: "", description: "" });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Assign Quota</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Autocomplete
            options={users}
            getOptionLabel={(u) => `${u.name} (${u.email})`}
            value={form.user}
            onChange={handleUserChange}
            renderInput={(params) => <TextField {...params} label="User" required />}
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="Start Date"
              name="startDate"
              type="date"
              value={form.startDate}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
            />
            <TextField
              label="End Date"
              name="endDate"
              type="date"
              value={form.endDate}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
            />
          </Stack>
          <TextField
            label="Quota Goal"
            name="goal"
            type="number"
            value={form.goal}
            onChange={handleChange}
            required
            fullWidth
          />
          <TextField
            select
            label="Unit"
            name="unit"
            value={form.unit}
            onChange={handleChange}
            required
            fullWidth
          >
            {units.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
          </TextField>
          <TextField
            select
            label="Region"
            name="region"
            value={form.region}
            onChange={handleChange}
            fullWidth
          >
            <MenuItem value="">(None)</MenuItem>
            {regions.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </TextField>
          <TextField
            select
            label="Plan"
            name="plan"
            value={form.plan}
            onChange={handleChange}
            fullWidth
          >
            <MenuItem value="">(None)</MenuItem>
            {plans.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </TextField>
          <TextField
            label="Description / Notes"
            name="description"
            value={form.description}
            onChange={handleChange}
            fullWidth
            multiline
            minRows={2}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}
