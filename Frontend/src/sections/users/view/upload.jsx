import React, { useState } from "react";
import { Modal, Upload, Button, Typography, Space,message  } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import postService from 'src/utils/httpService';
import postuploadService from 'src/utils/uploadService';
import { endpoints } from 'src/utils/axios';
import { paths } from 'src/routes/paths';
import Storage from 'src/utils/local-store';
import axios from 'axios';

const UploadUserAccounts = ({ visible, onClose,getUserList }) => {
  const [fileList, setFileList] = useState([]);
  const userDatas = Storage.getJson("userData");

  const sampleData = [
    {
      "First Name*": "john",
      "Last Name *": "dev",
      "Employee ID *": "jon123",
      "Email *": "johndev@gmail.com",
      "Role Name*": "admin",
      "Role Id*": "rjm_id",
      "Reporting User": "emp_id",
      "Active User": "false",
      "Region": "Region",
    },
  ];

  const requiredFields = ["First Name*", "Last Name *", "Employee ID *", "Email *", "Role Name*", "Role Id*"];

  // Function to validate file content
  const validateFileContent = (data) => {
    const isInvalid = data.some((row) =>
      requiredFields.some((field) => !row[field]?.trim())
    );
  
    if (isInvalid) {
      message.error("Validation failed: Some mandatory fields are missing.");
      return false;
    }
  
    return true;
  };
  

  // Read and validate file
  const readFileAndValidate = (file) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: "array" });

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (!validateFileContent(jsonData)) {
        setFileList([]); // Clear file if invalid
      } else {
        setFileList([file]); // Store file if valid
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const uploadProps = {
    beforeUpload: (file) => {
      const isCSVorXLSX =
        file.type === "text/csv" ||
        file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

      if (!isCSVorXLSX) {
        message.error("You can only upload CSV or XLSX files!");
        return Upload.LIST_IGNORE;
      }

      readFileAndValidate(file); // Validate content before upload
      return false; // Prevent auto-upload
    },
    fileList,
    onRemove: () => setFileList([]),
  };

  // Upload to API
  const handleSave = async () => {
    if (fileList.length === 0) {
      message.error("Please select a file to upload.");
      return;
    }
  
    const file = fileList[0].originFileObj || fileList[0]; // Ensure actual file object
  
    const formData = new FormData();
    formData.append("file", file);
    formData.append("org_code", userDatas.organization);
    formData.append("emp_id", userDatas.name);
  
    try {
      const response = await postuploadService(endpoints.auth.uploadUsers,'POST' ,formData);
  
      console.log("Upload success:", response.data);
      message.success("File uploaded successfully!");
      setFileList([]); // Clear file list after upload
      onClose(); // Close modal
      getUserList();
    } catch (error) {
      console.error("Upload error:", error);
      message.error("Upload failed, please try again.");
    }
  };

  


  const downloadCSV = () => {
    const csvContent = [
      Object.keys(sampleData[0]).join(","), // Header row
      ...sampleData.map((row) => Object.values(row).join(",")), // Data rows
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "User.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcel = () => {
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sample Data");

    XLSX.writeFile(wb, "User.xlsx");
  };

  return (
    <Modal title="Upload User Accounts" open={visible} onCancel={onClose} footer={null} width={500}>
      <Typography.Text>
        Start by creating an upload template (<a href="#" onClick={downloadExcel}>XLSX</a> |
        <a href="#" onClick={downloadCSV}>CSV</a>), and adding your data to the file.
        Then select your file and click Upload.
      </Typography.Text>

      <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
        <Upload  {...uploadProps} showUploadList>
          <Button className="btn-upload" icon={<UploadOutlined />}>Select A File</Button>
        </Upload>
      </div>

      {/* Save & Cancel Buttons */}
      <Space style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
        <Button  onClick={onClose}>Cancel</Button>
        <Button className="btn-add" onClick={handleSave}>
          Upload
        </Button>
      </Space>
    </Modal>
  );
};

export default UploadUserAccounts;
