import React, { useState } from 'react';
import { Button, Modal, Form, Input, InputNumber, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useProjectStore } from '../../stores/useProjectStore';

export const CreateProjectModal: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const createProject = useProjectStore((state) => state.createProject);

  const handleCreate = async (values: any) => {
    try {
      await createProject({
        projectName: values.projectName,
        displayName: values.displayName,
        canvasWidth: values.canvasWidth,
        canvasHeight: values.canvasHeight,
      });
      message.success('Project created successfully');
      setIsModalOpen(false);
      form.resetFields();
    } catch (error) {
      message.error('Failed to create project');
    }
  };

  return (
    <>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
        Create Project
      </Button>
      <Modal
        title="Create New Project"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          initialValues={{ canvasWidth: 800, canvasHeight: 800 }}
        >
          <Form.Item
            name="projectName"
            label="Project ID (Unique)"
            rules={[{ required: true, message: 'Please enter project ID' }]}
            tooltip="Used for folder names and matching assets (e.g., haier_2025_q1)"
          >
            <Input placeholder="haier_2025_q1" />
          </Form.Item>

          <Form.Item
            name="displayName"
            label="Display Name"
            rules={[{ required: true, message: 'Please enter display name' }]}
          >
            <Input placeholder="Haier 2025 Q1 Campaign" />
          </Form.Item>

          <Form.Item label="Canvas Size" style={{ marginBottom: 0 }}>
            <Form.Item
              name="canvasWidth"
              style={{ display: 'inline-block', width: 'calc(50% - 8px)' }}
            >
              <InputNumber placeholder="Width" addonAfter="px" />
            </Form.Item>
            <span style={{ display: 'inline-block', width: '16px', textAlign: 'center' }}>
              ×
            </span>
            <Form.Item
              name="canvasHeight"
              style={{ display: 'inline-block', width: 'calc(50% - 8px)' }}
            >
              <InputNumber placeholder="Height" addonAfter="px" />
            </Form.Item>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              Create
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
