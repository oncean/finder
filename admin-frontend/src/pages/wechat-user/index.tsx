import { SyncOutlined, UploadOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  FooterToolbar,
  PageContainer,
  ProTable,
} from '@ant-design/pro-components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Avatar,
  Button,
  Drawer,
  Form,
  Input,
  message,
  Switch,
  Tag,
  Upload,
} from 'antd';
import React, { useCallback, useRef, useState } from 'react';
import {
  createWechatUser,
  deleteWechatUser,
  fetchWechatUserList,
  updateWechatUser,
  type WechatUserItem,
} from '@/services/ant-design-pro/wechat-user';

const WechatUserPage: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WechatUserItem | null>(null);
  const [selectedRowsState, setSelectedRows] = useState<WechatUserItem[]>([]);

  const [formData, setFormData] = useState({
    nickname: '',
    avatar: '',
    phone: '',
    isAdmin: false,
  });

  const [avatarFileList, setAvatarFileList] = useState<any[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const getErrorMessage = (error: any, fallback: string) =>
    error?.info?.errorMessage || error?.message || fallback;

  const { mutate: createRun, isPending: creating } = useMutation({
    mutationFn: createWechatUser,
    onSuccess: () => {
      messageApi.success('创建成功');
      setDrawerOpen(false);
      resetForm();
      actionRef.current?.reload();
      queryClient.invalidateQueries({ queryKey: ['wechat-user'] });
    },
    onError: () => {
      messageApi.error('创建失败，请重试');
    },
  });

  const { mutate: updateRun, isPending: updating } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WechatUserItem> }) =>
      updateWechatUser(id, data),
    onSuccess: () => {
      messageApi.success('更新成功');
      setDrawerOpen(false);
      resetForm();
      actionRef.current?.reload();
      queryClient.invalidateQueries({ queryKey: ['wechat-user'] });
    },
    onError: () => {
      messageApi.error('更新失败，请重试');
    },
  });

  const { mutateAsync: delRun, isPending: deleting } = useMutation({
    mutationFn: deleteWechatUser,
    onSuccess: () => {
      messageApi.success('删除成功');
      actionRef.current?.reload();
      queryClient.invalidateQueries({ queryKey: ['wechat-user'] });
    },
    onError: (error: any) => {
      messageApi.error(getErrorMessage(error, '删除失败，请重试'));
    },
  });

  const resetForm = () => {
    setFormData({
      nickname: '',
      avatar: '',
      phone: '',
      isAdmin: false,
    });
    setAvatarFileList([]);
    setEditingItem(null);
  };

  const handleOpenDrawer = (item?: WechatUserItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        nickname: item.nickname || '',
        avatar: item.avatar || '',
        phone: item.phone || '',
        isAdmin: item.isAdmin || false,
      });
    } else {
      resetForm();
    }
    setDrawerOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.nickname) {
      messageApi.warning('请输入昵称');
      return;
    }

    if (editingItem) {
      updateRun({
        id: editingItem.id,
        data: {
          nickname: formData.nickname,
          avatar: formData.avatar,
          phone: formData.phone,
          isAdmin: formData.isAdmin,
        },
      });
    } else {
      createRun({
        nickname: formData.nickname,
        avatar: formData.avatar,
        phone: formData.phone,
        isAdmin: formData.isAdmin,
      });
    }
  };

  const handleDelete = useCallback(
    async (item: WechatUserItem) => {
      try {
        await delRun(item.id);
      } catch {
        // 错误信息已在 onError 中展示
      }
    },
    [delRun],
  );

  const handleBatchDelete = useCallback(async () => {
    if (selectedRowsState.length === 0) {
      messageApi.warning('请选择要删除的项');
      return;
    }
    for (const item of selectedRowsState) {
      try {
        await delRun(item.id);
      } catch {
        // 继续处理下一条，错误信息已在 onError 中展示
      }
    }
    setSelectedRows([]);
  }, [selectedRowsState, delRun, messageApi]);

  const columns: ProColumns<WechatUserItem>[] = [
    {
      title: '头像',
      dataIndex: 'avatar',
      width: 80,
      search: false,
      render: (avatar) => (
        <Avatar
          src={avatar as string}
          icon={!avatar ? '👤' : undefined}
          shape="circle"
          size={40}
        />
      ),
    },
    {
      title: '昵称',
      dataIndex: 'nickname',
      ellipsis: true,
      width: 150,
    },
    {
      title: 'OpenID',
      dataIndex: 'openid',
      ellipsis: true,
      width: 200,
      copyable: true,
    },
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 120,
    },
    {
      title: '城市',
      dataIndex: 'location',
      width: 120,
      search: false,
      render: (location) =>
        (location as WechatUserItem['location'])?.city || '-',
    },
    {
      title: '身份',
      dataIndex: 'isAdmin',
      width: 100,
      search: false,
      render: (isAdmin) =>
        isAdmin ? (
          <Tag color="red">管理员</Tag>
        ) : (
          <Tag color="blue">普通用户</Tag>
        ),
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      width: 180,
    },
    {
      title: '操作',
      dataIndex: 'option',
      valueType: 'option',
      width: 120,
      render: (_, record) => [
        <Button type="link" onClick={() => handleOpenDrawer(record)} key="edit">
          编辑
        </Button>,
        <Button
          type="link"
          danger
          onClick={() => handleDelete(record)}
          key="delete"
        >
          删除
        </Button>,
      ],
    },
  ];

  return (
    <PageContainer title="微信用户管理">
      {contextHolder}
      <ProTable<WechatUserItem>
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
        }}
        toolBarRender={() => [
          <Button
            type="primary"
            onClick={() => handleOpenDrawer()}
            key="create"
          >
            新增用户
          </Button>,
        ]}
        request={(params) =>
          fetchWechatUserList({
            current: params.current,
            pageSize: params.pageSize,
            keyword: params.keyword as string,
          }).then((res) => ({
            data: res.list || [],
            success: true,
            total: res.total || 0,
          }))
        }
        columns={columns}
        rowSelection={{
          onChange: (_, selectedRows) => {
            setSelectedRows(selectedRows);
          },
        }}
      />

      {selectedRowsState.length > 0 && (
        <FooterToolbar
          extra={
            <div>
              已选择{' '}
              <span style={{ fontWeight: 600 }}>
                {selectedRowsState.length}
              </span>{' '}
              项
            </div>
          }
        >
          <Button loading={deleting} onClick={handleBatchDelete} danger>
            批量删除
          </Button>
        </FooterToolbar>
      )}

      <Drawer
        title={editingItem ? '编辑用户' : '新增用户'}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          resetForm();
        }}
        width={500}
      >
        <div style={{ padding: '20px' }}>
          <Form.Item label="昵称" required style={{ marginBottom: 16 }}>
            <Input
              value={formData.nickname}
              onChange={(e) =>
                setFormData({ ...formData, nickname: e.target.value })
              }
              placeholder="请输入用户昵称"
            />
          </Form.Item>

          <Form.Item label="头像" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <Upload
                accept="image/*"
                listType="picture-card"
                fileList={avatarFileList}
                maxCount={1}
                beforeUpload={(file) => {
                  const isImage = file.type.startsWith('image/');
                  if (!isImage) {
                    messageApi.error('仅支持图片文件');
                    return Upload.LIST_IGNORE;
                  }
                  const isLt10M = file.size / 1024 / 1024 < 10;
                  if (!isLt10M) {
                    messageApi.error('图片大小不能超过 10MB');
                    return Upload.LIST_IGNORE;
                  }
                  return false;
                }}
                onChange={({ fileList }) => setAvatarFileList(fileList)}
                onRemove={() => {
                  setFormData({ ...formData, avatar: '' });
                  return true;
                }}
              >
                {avatarFileList.length === 0 && (
                  <div>
                    <UploadOutlined style={{ fontSize: 24 }} />
                    <div style={{ marginTop: 8 }}>选择图片</div>
                  </div>
                )}
              </Upload>

              {avatarFileList.length > 0 && (
                <Button
                  type="primary"
                  loading={uploadingAvatar}
                  onClick={async () => {
                    const file = avatarFileList[0]?.originFileObj;
                    if (!file) return;

                    setUploadingAvatar(true);
                    try {
                      const uploadFormData = new FormData();
                      uploadFormData.append('file', file);

                      const res = await fetch('/api/v1/upload/image', {
                        method: 'POST',
                        body: uploadFormData,
                      });
                      const data = await res.json();
                      if (data.url) {
                        setFormData({ ...formData, avatar: data.url });
                        messageApi.success('头像上传成功');
                      } else {
                        messageApi.error('上传失败');
                      }
                    } catch {
                      messageApi.error('上传失败，请重试');
                    } finally {
                      setUploadingAvatar(false);
                    }
                  }}
                  style={{ marginTop: 8 }}
                >
                  上传头像
                </Button>
              )}

              <Button
                icon={<SyncOutlined />}
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    const res = await fetch('/api/v1/admin/random-avatar', {
                      headers: token
                        ? { Authorization: `Bearer ${token}` }
                        : {},
                    });
                    const data = await res.json();
                    if (data.url) {
                      setFormData({ ...formData, avatar: data.url });
                      setAvatarFileList([]);
                      messageApi.success('已随机选择头像');
                    } else {
                      messageApi.error(data.message || '获取随机头像失败');
                    }
                  } catch {
                    messageApi.error('获取随机头像失败，请重试');
                  }
                }}
                style={{ marginTop: 8 }}
              >
                随机头像
              </Button>
            </div>

            <Input
              value={formData.avatar}
              onChange={(e) =>
                setFormData({ ...formData, avatar: e.target.value })
              }
              placeholder="或输入头像图片URL"
              style={{ marginTop: 12 }}
            />

            {formData.avatar && (
              <div style={{ marginTop: 12 }}>
                <Avatar
                  src={formData.avatar}
                  shape="circle"
                  size={64}
                  style={{ border: '1px solid #f0f0f0' }}
                />
              </div>
            )}
          </Form.Item>

          <Form.Item label="手机号" style={{ marginBottom: 16 }}>
            <Input
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="请输入手机号"
            />
          </Form.Item>

          <Form.Item label="管理员身份" style={{ marginBottom: 24 }}>
            <Switch
              checked={formData.isAdmin}
              onChange={(checked) =>
                setFormData({ ...formData, isAdmin: checked })
              }
            />
          </Form.Item>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button
              type="primary"
              loading={creating || updating}
              onClick={handleSubmit}
            >
              {editingItem ? '保存修改' : '创建'}
            </Button>
          </div>
        </div>
      </Drawer>
    </PageContainer>
  );
};

export default WechatUserPage;
