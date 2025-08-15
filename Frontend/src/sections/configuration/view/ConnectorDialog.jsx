import React from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, Stack, IconButton
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export default function ConnectorDialog({ open, onClose, schema, title, initialValues = {}, onSubmit }) {
  const [values, setValues] = React.useState(initialValues);

  React.useEffect(() => { setValues(initialValues); }, [initialValues, open]);

  const handleChange = (name, value) => setValues(v => ({ ...v, [name]: value }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>{title}</span>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          {schema.map(field => {
            if (field.type === "select") {
              return (
                <TextField
                  select
                  fullWidth
                  label={field.label}
                  key={field.name}
                  value={values[field.name] || ""}
                  onChange={e => handleChange(field.name, e.target.value)}
                  required={field.required}
                >
                  {field.options.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </TextField>
              );
            }
            if (field.type === "textarea") {
              return (
                <TextField
                  key={field.name}
                  label={field.label}
                  fullWidth
                  multiline
                  minRows={3}
                  value={values[field.name] || ""}
                  onChange={e => handleChange(field.name, e.target.value)}
                />
              );
            }
            return (
              <TextField
                key={field.name}
                label={field.label}
                fullWidth
                value={values[field.name] || ""}
                onChange={e => handleChange(field.name, e.target.value)}
                required={field.required}
              />
            );
          })}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSubmit(values)}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
