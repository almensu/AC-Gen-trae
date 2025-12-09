import React, { useEffect, useState } from 'react';
import { Button, Modal, Form, Input, InputNumber, message, Select, Tabs, List, Image, Tag, Popconfirm, Row, Col } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useProjectStore } from '../../stores/useProjectStore';
import { useAssetStore } from '../../stores/useAssetStore';
import { Project, DecorationAsset } from '@ac-gen/shared';
import { DecorationUpload } from '../AssetLibrary/DecorationUpload';

const { Option } = Select;

interface EditProjectModalProps {
  project: Project;
}

export const EditProjectModal: React.FC<EditProjectModalProps> = ({ project }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  
  const updateProject = useProjectStore((state) => state.updateProject);
  const { products, decorations, fetchProducts, fetchDecorations, deleteDecoration } = useAssetStore();

  useEffect(() => {
    if (isModalOpen) {
      fetchProducts();
      fetchDecorations(project.projectName); // Fetch decorations for this project
      
      form.setFieldsValue({
        displayName: project.displayName,
        canvasWidth: project.canvasWidth,
        canvasHeight: project.canvasHeight,
        linkedProductIds: project.linkedProductIds || [],
      });
    }
  }, [isModalOpen, project, fetchProducts, fetchDecorations, form]);

  const handleUpdate = async (values: any) => {
    try {
      await updateProject(project.id, {
        displayName: values.displayName,
        canvasWidth: values.canvasWidth,
        canvasHeight: values.canvasHeight,
        linkedProductIds: values.linkedProductIds,
      });
      message.success('Project updated successfully');
      setIsModalOpen(false);
    } catch (error) {
      message.error('Failed to update project');
    }
  };

  const handleDeleteDecoration = async (decoId: string) => {
    try {
      await deleteDecoration(decoId);
      message.success('Decoration deleted');
      fetchDecorations(project.projectName); // Refresh list
    } catch (error) {
      message.error('Failed to delete decoration');
    }
  };

  const decorationList = decorations.filter(d => d.meta.projectName === project.projectName);

  return (
    <>
      <Button type="link" icon={<EditOutlined />} onClick={() => setIsModalOpen(true)}>
        Edit
      </Button>
      <Modal
        title={`Edit Project: ${project.projectName}`}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={800}
      >
        <Tabs defaultActiveKey="info">
          <Tabs.TabPane tab="Basic Info & Products" key="info">
            <Form
              form={form}
              layout="vertical"
              onFinish={handleUpdate}
            >
              <Form.Item
                name="displayName"
                label="Display Name"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>

              <Form.Item label="Canvas Size" style={{ marginBottom: 0 }}>
                <Form.Item
                  name="canvasWidth"
                  style={{ display: 'inline-block', width: 'calc(50% - 8px)' }}
                >
                  <InputNumber placeholder="Width" addonAfter="px" />
                </Form.Item>
                <span style={{ display: 'inline-block', width: '16px', textAlign: 'center' }}>×</span>
                <Form.Item
                  name="canvasHeight"
                  style={{ display: 'inline-block', width: 'calc(50% - 8px)' }}
                >
                  <InputNumber placeholder="Height" addonAfter="px" />
                </Form.Item>
              </Form.Item>

              <Form.Item
                name="linkedProductIds"
                label="Linked Products (Whitelist)"
                tooltip="If selected, only these products will be available in Composition Builder for this project."
              >
                <Select
                  mode="multiple"
                  placeholder="Select products associated with this project"
                  style={{ width: '100%' }}
                  optionFilterProp="children"
                >
                  {products.map(p => (
                    <Option key={p.id} value={p.id}>
                      {p.meta.series} - {p.meta.color} ({p.meta.acFormFactor})
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" block>
                  Save Changes
                </Button>
              </Form.Item>
            </Form>
          </Tabs.TabPane>

          <Tabs.TabPane tab={`Decorations (${decorationList.length})`} key="decorations">
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Tag color="blue">Project Name: {project.projectName}</Tag>
                    <span style={{ color: '#999', fontSize: 12 }}>
                        Manage decorations for this project.
                    </span>
                </div>
                <DecorationUpload initialProjectName={project.projectName} />
            </div>
            
            <List
                itemLayout="horizontal"
                dataSource={decorationList}
                renderItem={(item) => (
                    <List.Item
                        actions={[
                            <Popconfirm
                                title="Delete decoration?"
                                onConfirm={() => handleDeleteDecoration(item.id)}
                            >
                                <Button type="text" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                        ]}
                    >
                        <List.Item.Meta
                            avatar={<Image src={`http://localhost:3001/storage/${item.filePath}`} width={60} />}
                            title={<Tag>{item.meta.category}</Tag>}
                            description={
                                <div>
                                    {item.meta.energyLevels?.map(e => <Tag key={e} color="green">{e}</Tag>)}
                                    {item.meta.capacityCodes?.map(c => <Tag key={c} color="blue">{c}</Tag>)}
                                </div>
                            }
                        />
                    </List.Item>
                )}
            />
          </Tabs.TabPane>
        </Tabs>
      </Modal>
    </>
  );
};
