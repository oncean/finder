import { UploadOutlined } from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  message,
  Popconfirm,
  Select,
  Upload,
} from 'antd';
import React, { useRef, useState } from 'react';
import { fetchChatGroupList } from '@/services/ant-design-pro/chat-group';
import {
  deleteMessage,
  fetchMessageList,
  sendMessage,
} from '@/services/ant-design-pro/message';
import { fetchShopList } from '@/services/ant-design-pro/shop';
import { uploadImage } from '@/services/ant-design-pro/upload';
import { fetchWechatUserList } from '@/services/ant-design-pro/wechat-user';

const MessageManagement: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [groupOptions, setGroupOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [shopOptions, setShopOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [userOptions, setUserOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const actionRef = useRef<ActionType | undefined>(undefined);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const messageType = Form.useWatch('type', form);
  const imageUrl = Form.useWatch('content', form);

  // 获取群组选项
  const loadGroupOptions = async () => {
    try {
      const res = await fetchChatGroupList({ pageSize: 100, current: 1 });
      if (res.list) {
        setGroupOptions(
          res.list.map((g: any) => ({
            label: g.name,
            value: g.id,
          })),
        );
      }
    } catch (error) {
      console.error('加载群组失败', error);
    }
  };

  // 获取店铺选项
  const loadShopOptions = async () => {
    try {
      const res = await fetchShopList({ pageSize: 100, current: 1 });
      if (res.data) {
        setShopOptions(
          res.data.map((shop: any) => ({
            label: shop.name,
            value: shop.id,
          })),
        );
      }
    } catch (error) {
      console.error('加载店铺失败', error);
    }
  };

  // 获取发送者选项
  const loadUserOptions = async () => {
    try {
      const res = await fetchWechatUserList({ pageSize: 100, current: 1 });
      if (res.data) {
        setUserOptions(
          res.data.map((user: any) => ({
            label: user.nickname || user.openid || user.id,
            value: user.id,
          })),
        );
      }
    } catch (error) {
      console.error('加载用户失败', error);
    }
  };

  const handleSend = async (values: any) => {
    if (!initialState?.currentUser) {
      message.error('请先登录');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        groupId: values.groupId,
        senderId: values.senderId,
        type: values.type || 'text',
      };

      if (values.type === 'shop_card') {
        payload.shopId = values.shopId;
      } else {
        payload.content = values.content;
      }

      await sendMessage(payload);
      message.success('消息发送成功');
      setIsModalVisible(false);
      form.resetFields();
      actionRef.current?.reloadAndRest?.();
      setTableRefreshKey((key) => key + 1);
    } catch (error: any) {
      message.error(error.message || '发送失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMessage(id);
      message.success('删除成功');
      actionRef.current?.reloadAndRest?.();
      setTableRefreshKey((key) => key + 1);
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  const openModal = () => {
    loadGroupOptions();
    loadShopOptions();
    loadUserOptions();
    form.resetFields();
    form.setFieldsValue({ type: 'text' });
    setImagePreviewUrl('');
    setIsModalVisible(true);
  };

  const columns: ProColumns<any>[] = [
    {
      title: '消息内容',
      dataIndex: 'content',
      ellipsis: true,
      search: false,
      render: (_, record) => {
        if (record.type === 'shop_card') {
          return record.shopCard?.name || '店铺卡片';
        }
        return record.content || '-';
      },
    },
    {
      title: '消息类型',
      dataIndex: 'type',
      valueType: 'select',
      valueEnum: {
        text: { text: '文本' },
        image: { text: '图片' },
        shop_card: { text: '店铺卡片' },
      },
    },
    {
      title: '发送者',
      dataIndex: ['sender', 'nickname'],
      search: false,
    },
    {
      title: '群组',
      dataIndex: ['group', 'name'],
      search: false,
    },
    {
      title: '发送时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      search: false,
      sorter: true,
    },
    {
      title: '操作',
      dataIndex: 'option',
      valueType: 'option',
      render: (_, record) => [
        <Popconfirm
          key="delete"
          title="确定要删除这条消息吗？"
          onConfirm={() => handleDelete(record.id)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" danger>
            删除
          </Button>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer>
      <Card>
        <ProTable
          headerTitle="消息列表"
          key={tableRefreshKey}
          actionRef={actionRef}
          rowKey="id"
          search={{
            labelWidth: 120,
          }}
          toolBarRender={() => [
            <Button type="primary" key="primary" onClick={openModal}>
              新建消息
            </Button>,
          ]}
          request={async (params, sort) => {
            const res = await fetchMessageList({
              ...params,
              pageSize: params.pageSize || 10,
              current: params.current || 1,
            });
            return {
              data: res.data || [],
              success: true,
              total: res.total || 0,
            };
          }}
          columns={columns}
        />
      </Card>

      <Modal
        title="新建消息"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={loading}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSend}
          initialValues={{ type: 'text' }}
        >
          <Form.Item
            name="groupId"
            label="选择群组"
            rules={[{ required: true, message: '请选择群组' }]}
          >
            <Select
              placeholder="请选择群组"
              options={groupOptions}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item
            name="senderId"
            label="选择发送者"
            rules={[{ required: true, message: '请选择发送者' }]}
          >
            <Select
              placeholder="请选择发送者"
              options={userOptions}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item
            name="type"
            label="消息类型"
            rules={[{ required: true, message: '请选择消息类型' }]}
          >
            <Select
              placeholder="请选择消息类型"
              onChange={() => {
                form.setFieldsValue({
                  content: undefined,
                  shopId: undefined,
                });
              }}
              options={[
                { label: '文本', value: 'text' },
                { label: '图片', value: 'image' },
                { label: '店铺卡片', value: 'shop_card' },
              ]}
            />
          </Form.Item>
          {messageType === 'text' && (
            <Form.Item
              name="content"
              label="文本内容"
              rules={[{ required: true, message: '请输入文本内容' }]}
            >
              <Input.TextArea rows={4} placeholder="请输入文本内容" />
            </Form.Item>
          )}
          {messageType === 'image' && (
            <Form.Item
              name="content"
              label="上传图片"
              rules={[{ required: true, message: '请上传图片' }]}
            >
              <div>
                <Upload
                  accept="image/*"
                  showUploadList={false}
                  beforeUpload={async (file) => {
                    setUploading(true);
                    try {
                      const res = await uploadImage(file);
                      form.setFieldsValue({ content: res.fileId });
                      setImagePreviewUrl(res.url);
                      message.success('图片上传成功');
                    } catch (error: any) {
                      message.error(error?.message || '图片上传失败');
                    } finally {
                      setUploading(false);
                    }
                    return false;
                  }}
                >
                  <Button icon={<UploadOutlined />} loading={uploading}>
                    {imagePreviewUrl ? '更换图片' : '上传图片'}
                  </Button>
                </Upload>
                {imagePreviewUrl && (
                  <div style={{ marginTop: 8 }}>
                    <img
                      src={imagePreviewUrl}
                      alt="图片预览"
                      style={{
                        width: 200,
                        maxHeight: 160,
                        objectFit: 'cover',
                        borderRadius: 4,
                      }}
                    />
                  </div>
                )}
              </div>
            </Form.Item>
          )}
          {messageType === 'shop_card' && (
            <Form.Item
              name="shopId"
              label="选择店铺"
              rules={[{ required: true, message: '请选择店铺' }]}
            >
              <Select
                placeholder="请选择店铺"
                options={shopOptions}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </PageContainer>
  );
};

export default MessageManagement;
