import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  FooterToolbar,
  PageContainer,
  ProTable,
} from '@ant-design/pro-components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Drawer,
  Form,
  Image,
  Input,
  InputNumber,
  message,
  Select,
  Switch,
  Tag,
} from 'antd';
import { useNavigate } from '@umijs/max';
import React, { useCallback, useRef, useState } from 'react';
import {
  deleteRecommendation,
  fetchAllPosts,
  fetchRecommendationList,
  type RecommendationItem,
  updateRecommendation,
} from '@/services/ant-design-pro/recommendation';

const RecommendationPage: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedRowsState, setSelectedRows] = useState<RecommendationItem[]>(
    [],
  );
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit'>('edit');
  const [editingItem, setEditingItem] = useState<RecommendationItem | null>(
    null,
  );

  const [allPosts, setAllPosts] = useState<RecommendationItem[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  const [formRank, setFormRank] = useState<number>(1);

  const { mutate: updateRun, isPending: updating } = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { isRecommended: boolean; recommendRank?: number };
    }) => updateRecommendation(id, data),
    onSuccess: () => {
      messageApi.success('更新成功');
      setDrawerOpen(false);
      actionRef.current?.reload();
      queryClient.invalidateQueries({ queryKey: ['recommendation'] });
    },
    onError: () => {
      messageApi.error('更新失败，请重试');
    },
  });

  const { mutate: delRun, isPending: deleting } = useMutation({
    mutationFn: deleteRecommendation,
    onSuccess: () => {
      messageApi.success('删除成功');
      actionRef.current?.reload();
      queryClient.invalidateQueries({ queryKey: ['recommendation'] });
    },
    onError: () => {
      messageApi.error('删除失败，请重试');
    },
  });

  const handleOpenAddDrawer = async () => {
    setDrawerMode('add');
    setEditingItem(null);
    setSelectedPostId('');
    setFormRank(1);

    try {
      const res = await fetchAllPosts({ pageSize: 100 });
      setAllPosts(res.list || []);
    } catch {
      setAllPosts([]);
    }
    setDrawerOpen(true);
  };

  const handleOpenEditDrawer = (item: RecommendationItem) => {
    setDrawerMode('edit');
    setEditingItem(item);
    setSelectedPostId(item.id);
    setFormRank(item.recommendRank || 0);
    setDrawerOpen(true);
  };

  const handleSubmit = () => {
    if (!selectedPostId) {
      messageApi.warning('请选择评价');
      return;
    }

    updateRun({
      id: selectedPostId,
      data: {
        isRecommended: true,
        recommendRank: formRank,
      },
    });
  };

  const handleToggleRecommend = (
    item: RecommendationItem,
    checked: boolean,
  ) => {
    updateRun({
      id: item.id,
      data: {
        isRecommended: checked,
        recommendRank: checked ? item.recommendRank || 0 : undefined,
      },
    });
  };

  const handleDelete = useCallback(
    async (item: RecommendationItem) => {
      await delRun(item.id);
    },
    [delRun],
  );

  const handleBatchDelete = useCallback(async () => {
    if (selectedRowsState.length === 0) {
      messageApi.warning('请选择要删除的项');
      return;
    }
    for (const item of selectedRowsState) {
      await delRun(item.id);
    }
    setSelectedRows([]);
  }, [selectedRowsState, delRun, messageApi]);

  const columns: ProColumns<RecommendationItem>[] = [
    {
      title: '封面',
      dataIndex: 'coverImage',
      width: 100,
      search: false,
      render: (_, record) =>
        record.coverImage ? (
          <Image
            src={record.coverImage}
            width={60}
            height={60}
            style={{ objectFit: 'cover', borderRadius: 4 }}
          />
        ) : (
          '-'
        ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true,
    },
    {
      title: '内容',
      dataIndex: 'content',
      ellipsis: true,
      search: false,
      width: 200,
    },
    {
      title: '作者',
      dataIndex: 'author',
      width: 120,
      search: false,
      render: (_, record) => record.author?.nickname || '-',
    },
    {
      title: '关联店铺',
      dataIndex: 'shop',
      width: 120,
      search: false,
      render: (_, record) => record.shop?.name || '-',
    },
    {
      title: '风向标排名',
      dataIndex: 'recommendRank',
      width: 100,
      search: false,
      sorter: (a, b) => (a.recommendRank || 0) - (b.recommendRank || 0),
      render: (_, record) => (
        <Tag color={record.recommendRank <= 3 ? 'green' : 'default'}>
          #{record.recommendRank || '-'}
        </Tag>
      ),
    },
    {
      title: '风向标状态',
      dataIndex: 'isRecommended',
      width: 100,
      search: false,
      render: (_, record) => (
        <Switch
          checked={record.isRecommended}
          onChange={(checked) => handleToggleRecommend(record, checked)}
          checkedChildren="风向标"
          unCheckedChildren="取消"
        />
      ),
    },
    {
      title: '位置',
      dataIndex: 'location',
      width: 150,
      search: false,
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      width: 180,
      search: false,
    },
    {
      title: '操作',
      dataIndex: 'option',
      valueType: 'option',
      width: 260,
      fixed: 'right',
      render: (_, record) => [
        <Button
          type="link"
          onClick={() => handleOpenEditDrawer(record)}
          key="edit"
        >
          编辑
        </Button>,
        <Button
          type="link"
          onClick={() =>
            navigate(`/comment?id=${record.id}`)
          }
          key="view-comment"
        >
          查看评论
        </Button>,
        <Button
          type="link"
          danger
          onClick={() => handleDelete(record)}
          key="delete"
        >
          取消风向标
        </Button>,
      ],
    },
  ];

  return (
    <PageContainer title="风向标管理">
      {contextHolder}
      <ProTable<RecommendationItem>
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
        }}
        toolBarRender={() => [
          <Button type="primary" onClick={handleOpenAddDrawer} key="add">
            添加风向标
          </Button>,
        ]}
        request={(params) =>
          fetchRecommendationList({
            current: params.current,
            pageSize: params.pageSize,
            keyword: params.title as string,
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
        pagination={{
          defaultPageSize: 20,
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
        title={drawerMode === 'add' ? '添加风向标' : '编辑风向标'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={600}
      >
        <div style={{ padding: '20px' }}>
          {drawerMode === 'add' && (
            <Form.Item label="选择评价" required style={{ marginBottom: 24 }}>
              <Select
                showSearch
                style={{ width: '100%' }}
                placeholder="搜索并选择评价"
                value={selectedPostId || undefined}
                onChange={setSelectedPostId}
                filterOption={(input, option) =>
                  (option?.label as string)
                    ?.toLowerCase()
                    .includes(input.toLowerCase())
                }
                options={allPosts
                  .filter((p) => !p.isRecommended)
                  .map((p) => ({
                    label: `${p.title}${p.shop ? ` - ${p.shop.name}` : ''}${p.author ? ` (${p.author.nickname})` : ''}`,
                    value: p.id,
                  }))}
                notFoundContent="暂无可设置风向标的评价"
              />
            </Form.Item>
          )}

          {drawerMode === 'edit' && editingItem && (
            <Form.Item label="评价标题" style={{ marginBottom: 24 }}>
              <Input value={editingItem.title} disabled />
            </Form.Item>
          )}

          <Form.Item label="风向标排名" required style={{ marginBottom: 24 }}>
            <InputNumber
              value={formRank}
              onChange={(val) => setFormRank(val || 0)}
              min={0}
              max={9999}
              style={{ width: '100%' }}
              placeholder="数字越小排名越靠前"
            />
          </Form.Item>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" loading={updating} onClick={handleSubmit}>
              {drawerMode === 'add' ? '设为推荐' : '保存修改'}
            </Button>
          </div>
        </div>
      </Drawer>
    </PageContainer>
  );
};

export default RecommendationPage;
