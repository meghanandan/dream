import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  Grid,
  CardContent,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  Button,
  Breadcrumbs,
  Stack,
  IconButton
} from "@mui/material";
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { green } from '@mui/material/colors';
import { Link } from "react-router-dom";
import postService from 'src/utils/httpService';
import Storage from 'src/utils/local-store';
import { endpoints } from 'src/utils/axios';
import CsvUploadDialog from "./CsvUploadDialog";
import ConnectorDialog from "./ConnectorDialog";

// Dummy data for display if APIs not configured
const dummyConnectors = [
  { id: 1, external_api_code: 'sf', api_name: "Salesforce", image: "/configuration/Salesforce.png", description: "" },
  { id: 2, external_api_code: 'xc', api_name: "Xactly", image: "/configuration/Xactly.png", description: "" },
  { id: 3, external_api_code: 'ql', api_name: "QuickBooks", image: "/configuration/quickbooks.png", description: "" },
  { id: 4, external_api_code: 'hs', api_name: "HubSpot", image: "/configuration/hubspot.png", description: "" },
  { id: 5, external_api_code: 'ca', api_name: "CaptivateIQ", image: "/configuration/captivateiq.png", description: "" },
  { id: 6, external_api_code: 'ns', api_name: "Netsuite", image: "/configuration/netsuite.png", description: "" },
  { id: 7, external_api_code: 'var', api_name: "Varicent", image: "/configuration/varicent.png", description: "" },
];

// Schema for API connector dialog
const apiSchema = [
  { name: "name", label: "Connector Name", type: "text", required: true },
  { name: "api_url", label: "API Endpoint URL", type: "text", required: true },
  { name: "auth_type", label: "Authentication", type: "select", required: true, options: [
    { value: "none", label: "None" },
    { value: "apikey", label: "API Key" },
    { value: "bearer", label: "Bearer Token" }
  ]},
  { name: "api_key", label: "API Key (if needed)", type: "text" },
  { name: "bearer_token", label: "Bearer Token (if needed)", type: "text" },
];

// Schema for webhook dialog
const webhookSchema = [
  { name: "name", label: "Webhook Name", type: "text", required: true },
  { name: "event", label: "Event to Trigger", type: "select", required: true, options: [
    { value: "create", label: "On Create" },
    { value: "update", label: "On Update" },
    { value: "delete", label: "On Delete" }
  ]},
  { name: "webhook_url", label: "Webhook URL", type: "text", required: true },
  { name: "secret", label: "Secret Key (optional)", type: "text" },
  { name: "payload_template", label: "Payload Template", type: "textarea" },
];

export function APIConfiguration() {
  const [open, setOpen] = useState(false); // For default connector dialog
  const [selectedItem, setSelectedItem] = useState(null);
  const [formError, setFormError] = useState('');
  const [alert, setAlert] = useState(null);
  const [configSchema, setConfigSchema] = useState([]);
  const [cardData, setCardData] = useState([]);
  const userData = Storage.getJson("userData");

  // Dialogs for custom actions
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [apiDialogOpen, setApiDialogOpen] = useState(false);
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);

  // Open connector config dialog (Xactly, Salesforce, etc)
  const handleOpen = (item) => {
    if (item.keys && item.keys.length > 0) {
      setSelectedItem(item);
      setConfigSchema(item.keys);
      setOpen(true);
    }
  };

  // API: fetch all connectors
  useEffect(() => {
    getConfigrationApis();
  }, []);

  const getConfigrationApis = async () => {
    try {
      const payload = { org_code: userData.organization };
      const result = await postService(endpoints.external_api.api_form, "POST", payload);

      if (result?.status) {
        // Mark which connectors are configured
        const configured = {};
        (result.data || []).forEach(api => { configured[api.external_api_code] = true; });
        // Keep order of dummyConnectors
        setCardData(
          dummyConnectors.map(dc => ({
            ...dc,
            configured: !!configured[dc.external_api_code],
            keys: (result.data || []).find(a => a.external_api_code === dc.external_api_code)?.keys || [],
          }))
        );
      } else {
        setCardData(dummyConnectors);
      }
    } catch (error) {
      setCardData(dummyConnectors);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedItem(null);
  };

  // Breadcrumbs
  const breadcrumbs = [
    <Link underline="hover" key="1" color="inherit" to="/home">Home</Link>,
    <Typography key="3" sx={{ color: 'text.primary' }}>Connectors</Typography>
  ];

  return (
    <Box sx={{ px: 3, py: 2, minHeight: '100vh' }}>
      <Stack spacing={1}>
        <Breadcrumbs separator="›" aria-label="breadcrumb">
          {breadcrumbs}
        </Breadcrumbs>
      </Stack>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
          flexWrap: 'wrap'
        }}
      >
        <Typography variant="h4" gutterBottom>
          Connectors
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button variant="contained" color="primary" onClick={() => setApiDialogOpen(true)}>
            Add new connector
          </Button>
          <Button variant="outlined" color="primary" onClick={() => setCsvDialogOpen(true)}>
            Upload CSV data
          </Button>
          {/* <Button variant="outlined" color="secondary" onClick={() => setWebhookDialogOpen(true)}>
            Add Webhook
          </Button> */}
        </Stack>
      </Box>

      <Grid container spacing={3}>
        {cardData.map((item) => (
          <Grid key={item.external_api_code} item xs={12} sm={4} md={2}>
            <Card
              onClick={() => handleOpen(item)}
              sx={{
                cursor: item.keys && item.keys.length > 0 ? "pointer" : "default",
                position: 'relative',
                height: '100%'
              }}
            >
              {item.configured && (
                <CheckCircleIcon
                  sx={{
                    color: green[500],
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    fontSize: 30
                  }}
                />
              )}
              <CardContent
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: '100%'
                }}
              >
                <img
                  alt={item.api_name}
                  src={item.image}
                  style={{
                    maxWidth: "60%",
                    objectFit: "contain",
                    marginBottom: 12
                  }}
                  loading="lazy"
                  onError={e => { e.target.style.opacity = 0; }}
                />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>{item.api_name}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Dialog for Xactly, Salesforce, etc */}
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedItem ? `Configure ${selectedItem.api_name}` : "Add Details"}
        </DialogTitle>
        <DialogContent>
          {configSchema && configSchema.map((item) => (
            <TextField
              key={item.id}
              margin="dense"
              fullWidth
              variant="outlined"
              label={item.api_key_label}
              name={item.api_key}
              type={item.field_type || "text"}
              value={item.value}
              onChange={(e) => {
                configSchema.forEach((field) => {
                  if (field.api_key === item.api_key) {
                    field.value = e.target.value;
                  }
                });
                setConfigSchema([...configSchema]);
              }}
            />
          ))}
          {formError && (
            <Typography variant="body2" color="error" sx={{ mb: 2 }}>
              {formError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="contained" color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* API connector dialog */}
      <ConnectorDialog
        open={apiDialogOpen}
        onClose={() => setApiDialogOpen(false)}
        schema={apiSchema}
        title="Configure API Connector"
        initialValues={{}}
        onSubmit={(data) => { /* handle save */ }}
        loading={false}
        error={null}
      />

      {/* Webhook dialog */}
      <ConnectorDialog
        open={webhookDialogOpen}
        onClose={() => setWebhookDialogOpen(false)}
        schema={webhookSchema}
        title="Configure Webhook"
        initialValues={{}}
        onSubmit={(data) => { /* handle save */ }}
        loading={false}
        error={null}
      />

      {/* CSV dialog */}
      <CsvUploadDialog open={csvDialogOpen} onClose={() => setCsvDialogOpen(false)} />
    </Box>
  );
}

export default APIConfiguration;
