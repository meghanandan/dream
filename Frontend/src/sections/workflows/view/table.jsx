import { Table, Tag, Tooltip, Button, Space, Modal,message } from "antd";
import {
  Switch
} from '@mui/material';
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { paths } from 'src/routes/paths';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import postService from 'src/utils/httpService';
import Storage from 'src/utils/local-store';
import { endpoints } from 'src/utils/axios';

export function AntTable(props) {
  const { workflowsdata, page, rowsPerPage, approvePermission, handleOpen, changeStaus, loading, count, deleteWorkflow,getWorkFlow } = props;
  const navigate = useNavigate();

  // State for delete confirmation modal
  const [showModel, setShowModel] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const handleCancel = () => {
    setShowModel(false);
    setDeleteId(null);
  };

  const handleConfirmDelete = async() => {
    if (deleteId) {
      const payload = { id: deleteId }  
    try {
    const res = await postService(endpoints.auth.deleteWorkflow, 'POST', payload);
    if (res.status) {
      message.success(res.message);
      getWorkFlow();
    } else {
      console.log('No data found.');
    }
  } catch (error) {
    console.error('Error fetching user list:', error);
  } finally {
     console.log('No data found.');
  }

  setShowModel(false);
    }
    setShowModel(false);
  };

  const columns = [
    {
      title: "S.No",
      dataIndex: "sno",
      key: "sno",
      render: (_, __, index) => (page - 1) * rowsPerPage + index + 1,
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text) => text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : "--",
    },
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      render: (text) => text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : "--",
    },
    {
      title: "Stage",
      dataIndex: "work_flow_status",
      key: "stage",
      render: (status, record) => (
        <>
          <Tag color={status === "1" ? "orange" : status === "2" ? "green" : "red"}>
            {status === "1" ? "Pending" : status === "2" ? "Approved" : "Rejected"}
          </Tag>
          {approvePermission && (
            <Tooltip title="Edit Stage">
              <Button className="btn-add" icon={<EditOutlined style={{ fontSize: '20px' }} />} onClick={() => handleOpen(status, record.id)} />
            </Tooltip>
          )}
        </>
      ),
    },
    {
      title: "Archive",
      dataIndex: "status",
      key: "archive",
      render: (status, record) => (
        <Switch checked={status} onChange={(e) => changeStaus(record.id, record.emp_id, e)} />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit Workflow">
            <Button className="btn-add" icon={<EditOutlined style={{ fontSize: '20px' }} />} onClick={() => navigate(paths.workflows.edit(record.id))} />
          </Tooltip>
          <Tooltip title="Delete Workflow">
            <Button
              className="btn-add"
              icon={<DeleteOutlined style={{ fontSize: '20px' }} />}
              onClick={() => { setShowModel(true); setDeleteId(record.id); }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <>
     <div className={showModel ? "blur-background" : ""}>

    
      <Table
        columns={columns}
        dataSource={workflowsdata}
        rowKey="id"
        loading={loading}
        pagination={false}
        locale={{ emptyText: "No matching fields found." }}
        scroll={{ x: 'max-content' }}
        rowClassName={(record, index) => (index % 2 === 0 ? 'table-row-white' : 'table-row-gray')}
        className="custom-table"
      />
       </div>

      {/* Delete Confirmation Modal */}
      <Modal
        title="Are you sure you want to delete this Workflow?"
        open={showModel}
        onCancel={handleCancel}
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            No, cancel
          </Button>,
          <Button key="confirm" type="primary" danger onClick={handleConfirmDelete}>
            Yes, confirm
          </Button>,
        ]}
      >
        <p>This action cannot be undone. The workflow`s data will be permanently removed.</p>
      </Modal>
    </>
  );
}

export default AntTable;
