import React, { useState, useEffect, useMemo } from 'react';
import { Table, Input, Checkbox, Modal, message, Button, Select, Tooltip, Breadcrumb } from 'antd';
import { Link } from 'react-router-dom';
import Storage from 'src/utils/local-store';
import postService from 'src/utils/httpService';
import { endpoints } from 'src/utils/axios';

const { Option } = Select;

export function SetUpDreamData() {
  const [orders, setOrders] = useState([]);
  const [dropDown, setDropDown] = useState([]);
  const [openSuccessModal, setOpenSuccessModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const userData = Storage.getJson('userData');
  const { organization, user_id } = userData;

  useEffect(() => {
    const fetchData = async () => {
      try {
        await Promise.all([getDropDown(), getOrders()]);
      } catch (error) {
        message.error('Error fetching data. Please try again.');
      }
    };
    fetchData();
  }, []);

  const getOrders = async () => {
    const payload = { org_code: organization, user_id };
    try {
      const res = await postService(endpoints.external_api.getFieldsMappingInfoList, 'POST', payload);
      if (res.status) {
        setOrders(res.data);
      } else {
        message.warning('No data found.');
      }
    } catch (error) {
      message.error('Error fetching orders. Please try again.');
    }
  };

  const getDropDown = async () => {
    const payload = { name: 'table_types' };
    try {
      const res = await postService(endpoints.external_api.dropDownApi, 'POST', payload);
      if (res.status) {
        setDropDown(res.data);
      } else {
        message.warning('No dropdown data found.');
      }
    } catch (error) {
      message.error('Error fetching dropdown. Please try again.');
    }
  };

  const handleChange = (id, key, value) => {
    setOrders(prev => prev.map(item => (item.id === id ? { ...item, [key]: value } : item)));
  };

const handleSubmit = async () => {
  const payload = {
    org_code: organization,
    user_id,
    fields: orders.map(item => ({
      ...item,
      destination_type: Number(item.destination_type)
    }))
  };
  try {
    const res = await postService(endpoints.external_api.updateFieldsMappingInfo, 'POST', payload);
    if (res.status) {
      setAlertMessage(res.message);
      setOpenSuccessModal(true);
    } else {
      message.error('Update failed.');
    }
  } catch (error) {
    message.error('Error submitting data. Please try again.');
  }
};


  const columns = useMemo(() => [
    {
      title: 'Field Name',
      dataIndex: 'field_name',
      key: 'field_name',
    },
    {
      title: <Tooltip title="Label to display for this field">Field Label</Tooltip>,
      dataIndex: 'field_label',
      key: 'field_label',
      render: (text, record) => (
        <Input
          value={text}
          onChange={(e) => handleChange(record.id, 'field_label', e.target.value)}
        />
      ),
    },
    {
      title: <Tooltip title="Allow editing this field">Editable</Tooltip>,
      dataIndex: 'is_editable',
      key: 'is_editable',
      render: (text, record) => (
        <Checkbox
          checked={record.is_editable}
          onChange={(e) => handleChange(record.id, 'is_editable', e.target.checked)}
        />
      ),
    },
    {
      title: <Tooltip title="Should this field be visible">Visible</Tooltip>,
      dataIndex: 'is_visible',
      key: 'is_visible',
      render: (text, record) => (
        <Checkbox
          checked={record.is_visible}
          onChange={(e) => handleChange(record.id, 'is_visible', e.target.checked)}
        />
      ),
    },
    {
      title: <Tooltip title="Where to send this field">Destination Type</Tooltip>,
      dataIndex: 'destination_type',
      key: 'destination_type',
      render: (text, record) => (
        <Select
          value={String(record.destination_type ?? "")}
          style={{ width: '100%' }}
          onChange={(value) => handleChange(record.id, 'destination_type', value)}
        >
          {dropDown.map((option) => (
            <Option key={option.id} value={option.id}>
              {option.name}
            </Option>
          ))}
        </Select>

      ),
    },
  ], [dropDown]);

  return (
    <div style={{ padding: 15, minHeight: '100vh' }}>
      <Breadcrumb>
        <Breadcrumb.Item><Link to="/home">Home</Link></Breadcrumb.Item>
        <Breadcrumb.Item>Set Up</Breadcrumb.Item>
      </Breadcrumb>

      <h2 style={{margin: '0.5rem 0'}}>Set Up</h2>

      <div style={{ background: '#fff', padding: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <Table
          dataSource={orders}
          columns={columns}
          rowKey="id"
          pagination={false}
          scroll={{ x: 'max-content' }}
          rowClassName={(record, index) => (index % 2 === 0 ? 'table-row-white' : 'table-row-gray')}
        />
        <Button className="orange-button" onClick={handleSubmit} style={{ margin: '0.75rem' }}>
          Submit
        </Button>
      </div>

      <Modal
        title="Success"
        visible={openSuccessModal}
        onOk={() => setOpenSuccessModal(false)}
        onCancel={() => setOpenSuccessModal(false)}
        footer={[
          <Button key="ok" type="primary" onClick={() => setOpenSuccessModal(false)}>
            OK
          </Button>
        ]}
      >
        {alertMessage}
      </Modal>
    </div>
  );
}

export default SetUpDreamData;
