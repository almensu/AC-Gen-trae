import React, { useState } from 'react';
import { Upload, Button, Form, Input, Select, message, Modal } from 'antd';
import { UploadOutlined, PlusOutlined } from '@ant-design/icons';
import { useAssetStore } from '../../stores/useAssetStore';
import { ProductAssetMeta, ProductCategory, AcFormFactor, EnergyLevelCode, CapacityCode } from '@ac-gen/shared';
import type { UploadFile } from 'antd/es/upload/interface';

const { Option } = Select;

export const ProductUpload: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const uploadProduct = useAssetStore((state) => state.uploadProduct);
  const [form] = Form.useForm();

  const handleUpload = async (values: any) => {
    if (fileList.length === 0) {
      message.error('Please select a file');
      return;
    }

    const file = fileList[0].originFileObj;
    if (!file) return;

    const meta: ProductAssetMeta = {
      category: values.category,
      acFormFactor: values.category === 'AC' ? values.acFormFactor : undefined,
      series: values.series,
      color: values.color,
      energyLevels: values.category === 'AC' ? values.energyLevels : undefined,
      capacityCodes: values.category === 'AC' ? values.capacityCodes : undefined,
    };

    const formData = new FormData();
    formData.append('productImage', file);
    formData.append('meta', JSON.stringify(meta));

    try {
      await uploadProduct(formData);
      message.success('Product uploaded successfully');
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

  return (
    <>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
        Upload Product
      </Button>
      <Modal
        title="Upload Product Asset"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpload}
          initialValues={{ category: 'AC' }}
        >
          <Form.Item
            name="file"
            label="Product Image (PNG)"
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

          <Form.Item name="category" label="Category" rules={[{ required: true }]}>
            <Select>
              <Option value="AC">Air Conditioner</Option>
              <Option value="LIFE_APPLIANCE">Life Appliance</Option>
            </Select>
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.category !== currentValues.category}
          >
            {({ getFieldValue }) =>
              getFieldValue('category') === 'AC' ? (
                <>
                  <Form.Item name="acFormFactor" label="Form Factor" rules={[{ required: true }]}>
                    <Select>
                      <Option value="WALL">Wall (挂机)</Option>
                      <Option value="CABINET">Cabinet (柜机)</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item name="energyLevels" label="Energy Levels">
                    <Select mode="multiple">
                      <Option value="B1">B1 (一级能效)</Option>
                      <Option value="B3">B3 (三级能效)</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item name="capacityCodes" label="Capacity Codes">
                    <Select mode="multiple">
                      <Option value="26">26</Option>
                      <Option value="35">35</Option>
                      <Option value="50">50</Option>
                      <Option value="72">72</Option>
                      <Option value="100">100</Option>
                    </Select>
                  </Form.Item>
                </>
              ) : null
            }
          </Form.Item>

          <Form.Item name="series" label="Series (e.g. 天丽)" rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name="color" label="Color (e.g. 皓雪白)" rules={[{ required: true }]}>
            <Input />
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
