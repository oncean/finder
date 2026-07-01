import type { ActionType, ProColumns } from '@ant-design/pro-components';
import {
  PageContainer,
  ProTable,
} from '@ant-design/pro-components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Drawer,
  Form,
  Image,
  InputNumber,
  message,
  Select,
} from 'antd';
import { useNavigate } from '@umijs/max';
import React, { useCallback, useRef, useState } from 'react';
import {
  batchUpdateRanking,
  deleteRecommendation,
  fetchAllPosts,
  fetchRecommendationList,
  type RecommendationItem,
  updateRecommendation,
} from '@/services/ant-design-pro/recommendation';
import { getImageUrl } from '@/utils/format';

const RecommendationPage: React.FC = () => {
  const actionRef = useRef<ActionType | null>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecommendationItem | null>(null);

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

  const { mutate: batchUpdateRun, isPending: batchUpdating } = useMutation({
    mutationFn: (rankings: Array<{ id: string; rank: number }>) =>
      batchUpdateRanking(rankings),
    onSuccess: () => {
      messageApi.success('排名更新成功');
      actionRef.current?.reload();
      queryClient.invalidateQueries({ queryKey: ['recommendation'] });
    },
    onError: () => {
      messageApi.error('排名更新失败，请重试');
    },
  });

  const { mutate: delRun, isPending: deleting } = useMutation({
    mutationFn: deleteRecommendation,
    onSuccess: () => {
      messageApi.success('移除成功');
      actionRef.current?.reload();
      queryClient.invalidateQueries({ queryKey: ['recommendation'] });
    },
    onError: () => {
      messageApi.error('移除失败，请重试');
    },
  });

  const handleOpenAddDrawer = async () => {
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

  const handleRankChange = useCallback(
    (id: string, newRank: number, oldRank: number) => {
      if (newRank === oldRank) return;
      batchUpdateRun([{ id, rank: newRank }]);
    },
    [batchUpdateRun],
  );

  const handleDelete = useCallback(
    async (item: RecommendationItem) => {
      await delRun(item.id);
    },
    [delRun],
  );

  const columns: ProColumns<RecommendationItem>[] = [
    {
      title: '排名',
      dataIndex: 'recommendRank',
      width: 80,
      search: false,
      render: (dom, record) => (
        <InputNumber
          size="small"
          min={1}
          defaultValue={record.recommendRank}
          style={{ width: 60 }}
          onBlur={(e) => {
            const newRank = parseInt(e.target.value, 10);
            if (!isNaN(newRank) && newRank !== record.recommendRank) {
              handleRankChange(record.id, newRank, record.recommendRank || 0);
            }
          }}
          onPressEnter={(e) => {
            const newRank = parseInt((e.target as HTMLInputElement).value, 10);
            if (!isNaN(newRank) && newRank !== record.recommendRank) {
              handleRankChange(record.id, newRank, record.recommendRank || 0);
            }
          }}
        />
      ),
    },
    {
      title: '封面',
      dataIndex: 'coverImage',
      width: 100,
      search: false,
      render: (_, record) =>
        record.coverImage ? (
          <Image
            src={getImageUrl(record.coverImage)}
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
      width: 120,
      fixed: 'right',
      render: (_, record) => [
        <Button
          type="link"
          onClick={() => navigate(`/comment?id=${record.id}`)}
          key="view"
        >
          查看
        </Button>,
        <Button
          type="link"
          danger
          onClick={() => handleDelete(record)}
          key="delete"
        >
          移除
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
        pagination={{
          defaultPageSize: 20,
        }}
      />

      <Drawer
        title="添加风向标"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={600}
      >
        <div style={{ padding: '20px' }}>
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
              设为推荐
            </Button>
          </div>
        </div>
      </Drawer>
    </PageContainer>
  );
};

export default RecommendationPage;
