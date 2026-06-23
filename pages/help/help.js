// pages/help/help.js - 使用帮助
Page({
  data: {
    searchKeyword: '',
    activeCategory: 'order',
    categories: [
      { key: 'order', name: '工单操作' },
      { key: 'attendance', name: '出勤打卡' },
      { key: 'income', name: '收入提现' },
      { key: 'account', name: '账号设置' }
    ],
    // 帮助教程
    tutorials: {
      order: {
        title: '工单操作指南',
        icon: '📋',
        steps: [
          { title: '查看工单', desc: '在「工单」页面可查看所有分配给您的今日工单', img: '' },
          { title: '接单操作', desc: '点击工单卡片下的「接单」按钮确认接单，接单后请按时上门服务', img: '' },
          { title: '联系客户', desc: '接单后点击「联系客户」可拨打电话确认服务详情', img: '' },
          { title: '完工上传', desc: '服务完成后点击「完工上传凭证」，拍照上传现场照片作为完工证明', img: '' }
        ]
      },
      attendance: {
        title: '出勤打卡指南',
        icon: '⏰',
        steps: [
          { title: '上班打卡', desc: '在「出勤设置」页面点击「上班打卡」，系统将记录您的打卡时间和位置', img: '' },
          { title: '下班签退', desc: '服务结束后点击「下班签退」完成当日出勤记录', img: '' },
          { title: '接单时段', desc: '设置每日可接单的时间段，非接单时段不会收到新工单推送', img: '' },
          { title: '请假申请', desc: '如需请假，填写日期和原因后提交申请，审核通过后当日不再派单', img: '' }
        ]
      },
      income: {
        title: '收入提现指南',
        icon: '💰',
        steps: [
          { title: '查看收入', desc: '在「收入明细」页面可查看所有工单佣金和提现流水', img: '' },
          { title: '收入构成', desc: '每单完成后佣金自动计入您的收入账户，可在明细中查看每单金额', img: '' },
          { title: '提现规则', desc: '收入余额满100元可申请提现，审核通过后3个工作日内到账', img: '' }
        ]
      },
      account: {
        title: '账号设置指南',
        icon: '⚙️',
        steps: [
          { title: '修改密码', desc: '在「设置」→「修改登录密码」中输入原密码和新密码即可修改', img: '' },
          { title: '更换手机号', desc: '在「设置」→「更换绑定手机号」中验证身份后更新绑定手机', img: '' },
          { title: '切换账号', desc: '在「设置」底部点击「切换师傅账号」可以切换到其他师傅账号', img: '' }
        ]
      }
    },
    // FAQ 列表
    faqList: [
      { q: '如何接单？', a: '在「今日工单」页面，找到状态为「待接单」的订单，点击「接单」按钮即可。', open: false },
      { q: '接单后可以取消吗？', a: '接单后如需取消请联系客服处理，频繁取消可能影响您的接单率。', open: false },
      { q: '忘记打卡怎么办？', a: '请联系客服说明情况，由管理员后台补录出勤记录。', open: false },
      { q: '提现多久到账？', a: '提现申请提交后，3个工作日内审核，通过后款项将转入您绑定的银行卡。', open: false },
      { q: '如何修改接单时段？', a: '在「我的」→「出勤设置」中可设置每日接单时间段，保存后立即生效。', open: false },
      { q: '收到不是我的工单怎么处理？', a: '请联系客服确认，可能是系统分配异常，客服会为您调整。', open: false }
    ],
    filteredFaq: []
  },

  onLoad() {
    this.setData({ filteredFaq: this.data.faqList })
  },

  // 搜索
  onSearchInput(e) {
    const keyword = e.detail.value.toLowerCase()
    this.setData({ searchKeyword: keyword })
    if (!keyword) {
      this.setData({ filteredFaq: this.data.faqList })
      return
    }
    const filtered = this.data.faqList.filter(item =>
      item.q.toLowerCase().includes(keyword) || item.a.toLowerCase().includes(keyword)
    )
    this.setData({ filteredFaq: filtered })
  },

  // 分类切换
  onCategoryChange(e) {
    const { key } = e.currentTarget.dataset
    this.setData({ activeCategory: key })
  },

  // FAQ 折叠展开
  onFaqToggle(e) {
    const { index } = e.currentTarget.dataset
    const key = `filteredFaq[${index}].open`
    this.setData({ [key]: !this.data.filteredFaq[index].open })
  },

  // 联系客服
  onContact() {
    wx.makePhoneCall({ phoneNumber: '4000000000' })
  }
})
