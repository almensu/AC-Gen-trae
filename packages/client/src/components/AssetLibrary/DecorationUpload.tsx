import React, { useState } from 'react';
import { Upload, Button, Form, Input, Select, message, Modal, InputNumber } from 'antd';
import { UploadOutlined, PlusOutlined } from '@ant-design/icons';
import { useAssetStore } from '../../stores/useAssetStore';
import { DecorationAssetMeta, DecorationCategory } from '@ac-gen/shared';
import type { UploadFile } from 'antd/es/upload/interface';

const { Option } = Select;

export const DecorationUpload: React.FC<{ initialProjectName?: string }> = ({ initialProjectName }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const uploadDecoration = useAssetStore((state) => state.uploadDecoration);
  const [form] = Form.useForm();

  const handleUpload = async (values: any) => {
    if (fileList.length === 0) {
      message.error('Please select a file');
      return;
    }

    const file = fileList[0].originFileObj;
    if (!file) return;

    const meta: DecorationAssetMeta = {
      projectName: values.projectName,
      category: values.category,
      energyLevels: values.energyLevels,
      capacityCodes: values.capacityCodes,
      zIndex: values.zIndex,
    };

    const formData = new FormData();
    formData.append('decorationImage', file);
    formData.append('meta', JSON.stringify(meta));

    try {
      await uploadDecoration(formData);
      message.success('Decoration uploaded successfully');
      setIsModalOpen(false);
      form.resetFields();
      setFileList([]);
    } catch (error) {
      message.error('Upload failed');
    }
  };

  const normFile = (e: any) => {
    if (Array.isArray(e)) {
      return e;
    }
    return e?.fileList;
  };

  const handleOpen = () => {
      setIsModalOpen(true);
      if (initialProjectName) {
          form.setFieldsValue({ projectName: initialProjectName });
      }
  };

  return (
    <>
      <Button type="primary" icon={<PlusOutlined />} onClick={handleOpen}>
        Upload Decoration
      </Button>
      <Modal
        title="Upload Decoration Asset"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpload}
          initialValues={{ category: 'OTHER', zIndex: 10, projectName: initialProjectName }}
        >
          <Form.Item
            name="file"
            label="Decoration Image (PNG)"
            valuePropName="fileList"
            getValueFromEvent={normFile}
            rules={[{ required: true, message: 'Please select an image' }]}
          >
            <Upload
              beforeUpload={() => false}
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
              accept=".png"
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>Select PNG</Button>
            </Upload>
          </Form.Item>

          <Form.Item name="projectName" label="Project Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. haier_2025_q1" disabled={!!initialProjectName} />
          </Form.Item>

          <Form.Item name="category" label="Category" rules={[{ required: true }]}>
            <Select>
              <Option value="BACKGROUND">Background</Option>
              <Option value="ENERGY_BADGE">Energy Badge</Option>
              <Option value="CAPACITY_BADGE">Capacity Badge</Option>
              <Option value="BRAND_LOGO">Brand Logo</Option>
              <Option value="OTHER">Other</Option>
            </Select>
          </Form.Item>

          <Form.Item name="energyLevels" label="Applicable Energy Levels (Optional)">
            <Select mode="multiple" placeholder="Select applicable levels">
              <Option value="B1">B1 (一级能效)</Option>
              <Option value="B3">B3 (三级能效)</Option>
            </Select>
          </Form.Item>

          <Form.Item name="capacityCodes" label="Applicable Capacity Codes (Optional)">
            <Select mode="multiple" placeholder="Select applicable capacities">
              <Option value="26">26</Option>
              <Option value="35">35</Option>
              <Option value="50">50</Option>
              <Option value="72">72</Option>
              <Option value="100">100</Option>
            </Select>
          </Form.Item>

          <Form.Item name="zIndex" label="Default Z-Index">
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Upload
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
