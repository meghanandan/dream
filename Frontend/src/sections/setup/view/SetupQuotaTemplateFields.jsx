import React, { useState, useEffect, useMemo } from 'react';
import { Table, Input, Checkbox, Modal, message, Button, Select, Tooltip, Breadcrumb, Tag } from 'antd';
import { Link } from 'react-router-dom';
import Storage from 'src/utils/local-store';
import postService from 'src/utils/httpService';
import { endpoints } from 'src/utils/axios';

const { Option } = Select;

export function SetupQuotaTemplateFields() {
  const [fields, setFields] = useState([]);
  const [dropDown, setDropDown] = useState([]);
  const [openSuccessModal, setOpenSuccessModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  // Get org code/user (adapt if different in your app)
  const userData = Storage.getJson('userData') || {};
  const { organization = 'gehc', user_id } = userData;

  // Fetch all fields (system + custom)
  useEffect(() => {
    const fetchFields = async () => {
      try {
        const res = await postService(endpoints.auth.getQuotaTemplateFields, 'POST', { org_code: organization });
        if (res.status) {
          setFields(res.data);
        } else {
          message.warning('No fields found.');
        }
      } catch (error) {
        message.error('Error fetching fields. Please try again.');
      }
    };
    fetchFields();
  }, [organization]);

  // Fetch dropdown for destination type (if needed)
  useEffect(() => {
    const fetchDropDown = async () => {
      try {
        const res = await postService('/api/external/dropdown', 'POST', { name: 'table_types' });
        if (res.status) setDropDown(res.data);
      } catch { console.log('Error fetching dropdown data'); }
    };
    fetchDropDown();
  }, []);

  // Handle edit for any field property
  const handleChange = (field_name, key, value) => {
    setFields(prev =>
      prev.map(item =>
        item.field_name === field_name ? { ...item, [key]: value } : item
      )
    );
  };

  // Save changes (call your save API here)
  const handleSubmit = async () => {
    try {
      // Adapt endpoint and payload as per your backend
      const payload = {
        org_code: organization,
        user_id,
        fields: fields.map(f => ({
          ...f,
          destination_type: Number(f.destination_type) || null,
        })),
      };
      // Stub: replace with actual save API
      // const res = await postService('/api/setup/quota-template-fields/save', 'POST', payload);
      // if (res.status) {
      setAlertMessage('Fields configuration saved!');
      setOpenSuccessModal(true);
      // } else {
      //   message.error('Update failed.');
      // }
    } catch (error) {
      message.error('Error submitting data. Please try again.');
    }
  };

  const columns = useMemo(() => [
    {
      title: 'Type',
      dataIndex: 'is_system',
      key: 'is_system',
      render: (is_system) =>
        is_system ? <Tag color="blue">System</Tag> : <Tag color="green">Custom</Tag>,
      width: 100,
    },
    {
      title: 'Field Name',
      dataIndex: 'field_name',
      key: 'field_name',
      width: 170,
    },
    {
      title: <Tooltip title="Label to display for this field">Field Label</Tooltip>,
      dataIndex: 'field_label',
      key: 'field_label',
      width: 220,
      render: (text, record) => (
        <Input
          value={text}
          disabled={record.is_system && !record.is_editable}
          onChange={e => handleChange(record.field_name, 'field_label', e.target.value)}
        />
      ),
    },
    {
      title: <Tooltip title="Allow editing this field">Editable</Tooltip>,
      dataIndex: 'is_editable',
      key: 'is_editable',
      width: 110,
      render: (checked, record) => (
        <Checkbox
          checked={record.is_editable}
          disabled={record.is_system}
          onChange={e => handleChange(record.field_name, 'is_editable', e.target.checked)}
        />
      ),
    },
    {
      title: <Tooltip title="Should this field be visible">Visible</Tooltip>,
      dataIndex: 'is_visible',
      key: 'is_visible',
      width: 110,
      render: (checked, record) => (
        <Checkbox
          checked={record.is_visible}
          onChange={e => handleChange(record.field_name, 'is_visible', e.target.checked)}
        />
      ),
    },
    {
      title: <Tooltip title="Where to send this field">Destination Type</Tooltip>,
      dataIndex: 'destination_type',
      key: 'destination_type',
      width: 180,
      render: (val, record) => (
        <Select
          value={String(record.destination_type ?? '')}
          style={{ width: '100%' }}
          onChange={value => handleChange(record.field_name, 'destination_type', value)}
        >
          {dropDown.map((option) => (
            <Option key={option.id} value={option.id}>{option.name}</Option>
          ))}
        </Select>
      ),
    },
    {
      title: <Tooltip title="DB Data Type">Data Type</Tooltip>,
      dataIndex: 'data_type',
      key: 'data_type',
      width: 130,
    },
  ], [dropDown]);

  return (
    <div style={{ padding: 15, minHeight: '100vh' }}>
      <Breadcrumb>
        <Breadcrumb.Item><Link to="/home">Home</Link></Breadcrumb.Item>
        <Breadcrumb.Item>Quota Template Field Setup</Breadcrumb.Item>
      </Breadcrumb>
      <h2 style={{ margin: '0.5rem 0' }}>Quota Template Field Setup</h2>
      <div style={{ background: '#fff', padding: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <Table
          dataSource={fields}
          columns={columns}
          rowKey="field_name"
          pagination={false}
          scroll={{ x: 'max-content' }}
          rowClassName={(record, index) => (index % 2 === 0 ? 'table-row-white' : 'table-row-gray')}
        />
        <Button className="orange-button" type="primary" onClick={handleSubmit} style={{ margin: '0.75rem' }}>
          Save Configuration
        </Button>
      </div>
      <Modal
        title="Success"
        open={openSuccessModal}
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

export default SetupQuotaTemplateFields;
