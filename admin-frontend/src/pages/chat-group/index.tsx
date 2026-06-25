import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import {
  Avatar,
  Button,
  Card,
  Form,
  Input,
  Modal,
  message,
  Popconfirm,
  Select,
  Space,
  Table,
} from 'antd';
import React, { useRef, useState } from 'react';
import {
  addChatGroupOnlineUser,
  type ChatGroupItem,
  type ChatGroupOnlineUserItem,
  createChatGroup,
  deleteChatGroup,
  deleteChatGroupOnlineUser,
  fetchChatGroupList,
  fetchChatGroupOnlineUsers,
  updateChatGroup,
} from '@/services/ant-design-pro/chat-group';
import {
  fetchWechatUserList,
  type WechatUserItem,
} from '@/services/ant-design-pro/wechat-user';

const ChatGroupManagement: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [onlineModalVisible, setOnlineModalVisible] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentId, setCurrentId] = useState<string>('');
  const [currentGroup, setCurrentGroup] = useState<ChatGroupItem | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<ChatGroupOnlineUserItem[]>([]);
  const [wechatUsers, setWechatUsers] = useState<WechatUserItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const actionRef = useRef<ActionType | undefined>(undefined);

  const getErrorMessage = (error: any, fallback: string) =>
    error?.info?.errorMessage || error?.message || fallback;

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      if (isEdit && currentId) {
        const res = await updateChatGroup(currentId, values);
        if (res.success) {
          message.success('群组更新成功');
          setIsModalVisible(false);
          form.resetFields();
          actionRef.current?.reload();
        } else {
          message.error(res.message || '更新失败');
        }
      } else {
        const res = await createChatGroup(values);
        if (res.success) {
          message.success('群组创建成功');
          setIsModalVisible(false);
          form.resetFields();
          actionRef.current?.reload();
        } else {
          message.error(res.message || '创建失败');
        }
      }
    } catch (error: any) {
      message.error(error.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record: ChatGroupItem) => {
    setIsEdit(true);
    setCurrentId(record.id);
    form.setFieldsValue({
      name: record.name,
      city: record.city,
      district: record.district,
    });
    setIsModalVisible(true);
  };

  const loadOnlineUsers = async (groupId: string) => {
    const res = await fetchChatGroupOnlineUsers(groupId);
    setOnlineUsers(res.data || []);
  };

  const openOnlineModal = async (record: ChatGroupItem) => {
    setCurrentGroup(record);
    setSelectedUserId(undefined);
    setOnlineModalVisible(true);
    setOnlineLoading(true);
    try {
      const [onlineRes, userRes] = await Promise.all([
        fetchChatGroupOnlineUsers(record.id),
        fetchWechatUserList({ current: 1, pageSize: 100 }),
      ]);
      setOnlineUsers(onlineRes.data || []);
      setWechatUsers(userRes.data || []);
    } catch (error: any) {
      message.error(getErrorMessage(error, '加载在线用户失败'));
    } finally {
      setOnlineLoading(false);
    }
  };

  const handleAddOnlineUser = async () => {
    if (!currentGroup?.id) {
      message.warning('请先选择群组');
      return;
    }

    if (!selectedUserId) {
      message.warning('请选择要新增的在线用户');
      return;
    }

    setOnlineLoading(true);
    try {
      const res = await addChatGroupOnlineUser(currentGroup.id, {
        userId: selectedUserId,
      });
      if (res.success) {
        message.success('在线用户添加成功');
        setSelectedUserId(undefined);
        await loadOnlineUsers(currentGroup.id);
        actionRef.current?.reload();
      } else {
        message.error(res.message || '添加失败');
      }
    } catch (error: any) {
      message.error(getErrorMessage(error, '添加失败'));
    } finally {
      setOnlineLoading(false);
    }
  };

  const handleDeleteOnlineUser = async (userId: string) => {
    if (!currentGroup?.id) {
      return;
    }

    setOnlineLoading(true);
    try {
      const res = await deleteChatGroupOnlineUser(currentGroup.id, userId);
      if (res.success) {
        message.success('在线用户删除成功');
        await loadOnlineUsers(currentGroup.id);
        actionRef.current?.reload();
      } else {
        message.error(res.message || '删除失败');
      }
    } catch (error: any) {
      message.error(getErrorMessage(error, '删除失败'));
    } finally {
      setOnlineLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await deleteChatGroup(id);
      if (res.success) {
        message.success('删除成功');
        actionRef.current?.reload();
      } else {
        message.error(res.message || '删除失败');
      }
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  const openCreateModal = () => {
    setIsEdit(false);
    setCurrentId('');
    form.resetFields();
    setIsModalVisible(true);
  };

  const columns: ProColumns<ChatGroupItem>[] = [
    {
      title: '群组名称',
      dataIndex: 'name',
      search: false,
    },
    {
      title: '城市',
      dataIndex: 'city',
      search: false,
    },
    {
      title: '区域',
      dataIndex: 'district',
      search: false,
    },
    {
      title: '在线人数',
      dataIndex: 'onlineCount',
      search: false,
    },
    {
      title: '创建时间',
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
        <Button
          type="link"
          key="online"
          onClick={() => openOnlineModal(record)}
        >
          设置在线用户
        </Button>,
        <Button type="link" key="edit" onClick={() => handleEdit(record)}>
          编辑
        </Button>,
        <Popconfirm
          key="delete"
          title="确定要删除这个群组吗？"
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

  const onlineUserColumns = [
    {
      title: '用户',
      dataIndex: 'user',
      render: (user: ChatGroupOnlineUserItem['user']) => (
        <Space>
          <Avatar
            size="small"
            src={user?.avatar}
            icon={!user?.avatar ? user?.nickname?.[0] : undefined}
          />
          <span>{user?.nickname || '未命名用户'}</span>
        </Space>
      ),
    },
    {
      title: '手机号',
      dataIndex: ['user', 'phone'],
      render: (phone: string) => phone || '-',
    },
    {
      title: '最近活跃',
      dataIndex: 'lastActiveAt',
      render: (lastActiveAt: string) =>
        lastActiveAt ? new Date(lastActiveAt).toLocaleString() : '-',
    },
    {
      title: '操作',
      dataIndex: 'option',
      render: (_: any, record: ChatGroupOnlineUserItem) => (
        <Popconfirm
          title="确定要删除这个在线用户吗？"
          onConfirm={() => handleDeleteOnlineUser(record.userId)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" danger>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const onlineUserIds = new Set(onlineUsers.map((item) => item.userId));

  return (
    <PageContainer>
      <Card>
        <ProTable
          headerTitle="群组列表"
          actionRef={actionRef}
          rowKey="id"
          search={{
            labelWidth: 120,
          }}
          toolBarRender={() => [
            <Button type="primary" key="primary" onClick={openCreateModal}>
              新建群组
            </Button>,
          ]}
          request={async (params) => {
            const res = await fetchChatGroupList({
              ...params,
              pageSize: params.pageSize || 10,
              current: params.current || 1,
            });
            return {
              data: res.data || [],
              success: res.success,
              total: res.total || 0,
            };
          }}
          columns={columns}
        />
      </Card>

      <Modal
        title={isEdit ? '编辑群组' : '新建群组'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={loading}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="群组名称"
            rules={[{ required: true, message: '请输入群组名称' }]}
          >
            <Input placeholder="请输入群组名称" />
          </Form.Item>
          <Form.Item name="city" label="城市">
            <Input placeholder="请输入城市" />
          </Form.Item>
          <Form.Item name="district" label="区域">
            <Input placeholder="请输入区域" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          currentGroup ? `设置在线用户：${currentGroup.name}` : '设置在线用户'
        }
        open={onlineModalVisible}
        onCancel={() => {
          setOnlineModalVisible(false);
          setCurrentGroup(null);
          setSelectedUserId(undefined);
          setOnlineUsers([]);
        }}
        footer={null}
        width={760}
        destroyOnClose
      >
        <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
          <Select
            style={{ width: '100%' }}
            placeholder="请选择要新增的在线用户"
            value={selectedUserId}
            onChange={setSelectedUserId}
            showSearch
            allowClear
            filterOption={(input, option) =>
              (option?.label as string)
                ?.toLowerCase()
                .includes(input.toLowerCase())
            }
            options={wechatUsers.map((user) => ({
              label: `${user.nickname || '未命名用户'}${user.phone ? ` (${user.phone})` : ''}${
                onlineUserIds.has(user.id) ? ' - 已在线' : ''
              }`,
              value: user.id,
              disabled: onlineUserIds.has(user.id),
            }))}
          />
          <Button
            type="primary"
            loading={onlineLoading}
            onClick={handleAddOnlineUser}
          >
            新增
          </Button>
        </Space.Compact>

        <Table<ChatGroupOnlineUserItem>
          rowKey="id"
          loading={onlineLoading}
          columns={onlineUserColumns}
          dataSource={onlineUsers}
          pagination={false}
        />
      </Modal>
    </PageContainer>
  );
};

export default ChatGroupManagement;
