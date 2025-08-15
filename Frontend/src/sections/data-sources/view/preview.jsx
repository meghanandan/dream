import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";
import { Table } from "antd";

// Convert columns to Ant Design format


  const PreViewModel = ({ open, onClose, preViewHeader, preViewData }) => (
    <Dialog open={open} fullWidth maxWidth="xl">
      <DialogTitle>Mapped DREAM Preview</DialogTitle>
      <DialogContent dividers>
        <Table
          columns={preViewHeader.map(({ key, label }) => ({ title: label, dataIndex: key, key }))}
          dataSource={preViewData}
          rowKey="id"
          pagination={false}
          scroll={{ x: "100%", y: 400 }}
          rowClassName={(record, index) => (index % 2 === 0 ? "table-row-white" : "table-row-gray")}
          className="custom-table"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined" color="secondary">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
  
  export default PreViewModel;
  
