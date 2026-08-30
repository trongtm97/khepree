import type { Messages } from "./contract";

export const vi = {
  meta: {
    siteName: "Khepree",
    defaultDescription:
      "Khepree tạo công cụ giúp bạn giảm việc lặp lại, xử lý những việc tốn thời gian nhanh hơn và dùng AI mà không cần rành công nghệ.",
  },
  nav: {
    products: "Sản phẩm",
    resources: "Tài nguyên",
    ecosystem: "Hệ sinh thái",
    about: "Về Khepree",
    viewAllProducts: "Xem tất cả sản phẩm",
    resourceBlog: "Blog",
    resourceDocs: "Tài liệu",
    resourceProductGuides: "Hướng dẫn sản phẩm",
    resourceSecurity: "Bảo mật",
    company: "Công ty",
    signIn: "Đăng nhập",
    signUp: "Tạo tài khoản",
    exploreProducts: "Tìm công cụ phù hợp",
    openMenu: "Mở menu",
    closeMenu: "Đóng menu",
  },
  hero: {
    headline: "Làm việc gọn hơn. Có thêm thời gian cho điều quan trọng.",
    supporting:
      "Khepree tạo ra những công cụ giúp bạn bớt việc lặp lại, xử lý những việc tốn thời gian nhanh hơn và tận dụng AI mà không cần rành công nghệ.",
    ctaPrimary: "Tìm công cụ phù hợp",
    ctaSecondary: "Tạo tài khoản",
  },
  valueStrip: {
    saveTime: "Tiết kiệm thời gian",
    workSmarter: "Bớt việc lặp lại",
    createMore: "Dễ bắt đầu",
    unlockOpportunities: "Làm được nhiều hơn",
  },
  products: {
    heading: "Chọn công cụ cho việc bạn đang cần.",
    copy: "Mỗi sản phẩm trả lời nhanh bốn câu hỏi: là gì, giúp việc gì, chạy trên thiết bị nào, và giá từ bao nhiêu.",
    whatItIs: "Đây là gì",
    helpsWith: "Giúp bạn",
    worksOn: "Dùng trên",
    emptyTitle: "Sản phẩm mới sẽ xuất hiện tại đây",
    emptyDescription:
      "Chúng tôi chỉ ra mắt khi công cụ thực sự giúp bạn xong việc. Có gì mới sẽ hiện ở đây.",
  },
  catalog: {
    free: "Miễn phí",
    contactSales: "Liên hệ bán hàng",
    priceUnavailable: "Chưa có giá",
    included: "Có",
    notIncluded: "Không",
    noFeaturesListed: "Chưa có tính năng được liệt kê.",
    checkout: "Thanh toán",
    startingFrom: "Từ",
    viewProduct: "Xem có phù hợp không",
    viewPlans: "Xem gói",
    getStarted: "Bắt đầu",
    solutionsIntro: "Phần mềm này giúp bạn khi…",
    featuresIntro: "Giúp bạn làm gì — không chỉ liệt kê tên tính năng.",
    pricingIntro: "Gói và giá chỉ dành cho sản phẩm này.",
    solutionProblem: "Tình huống",
    solutionResult: "Kết quả",
    nav: {
      sections: "Mục trang",
      overview: "Tổng quan",
      solutions: "Giải pháp",
      features: "Tính năng",
      pricing: "Giá",
      guides: "Hướng dẫn",
      faq: "FAQ",
    },
    periods: {
      month: "1 tháng",
      year: "1 năm",
    },
    platforms: {
      desktop: "Desktop",
      web: "Web",
      mobile: "Di động",
    },
    billing: {
      free: "Miễn phí",
      recurring: "Thuê bao",
      one_time: "Một lần",
      perpetual: "Trọn đời",
      contact_sales: "Tùy chỉnh",
    },
    sections: {
      benefits: "Bạn nhận được gì",
      solutions: "Giải pháp",
      features: "Tính năng",
      gallery: "Hình ảnh sản phẩm",
      platforms: "Dùng trên",
      requirements: "Bạn cần gì",
      howItWorks: "Bắt đầu thế nào",
      pricing: "Bảng giá",
      faq: "Câu hỏi thường gặp",
      guides: "Hướng dẫn",
      related: "Tài nguyên liên quan",
      cta: "Bắt đầu",
    },
  },
  why: {
    heading: "Phần mềm không nên làm bạn mệt thêm.",
    usefulFirst: {
      title: "Dễ hiểu ngay từ lần đầu",
      copy: "Mở lên là biết bấm gì — không cần xem hướng dẫn dài hay đoán menu.",
    },
    simpleByDesign: {
      title: "Chỉ giữ những tính năng thật sự cần",
      copy: "Nút nào không giúp bạn xong việc nhanh hơn thì không cần có.",
    },
    createRealValue: {
      title: "Ít bước hơn để hoàn thành công việc",
      copy: "Bớt bấm, bớt copy-paste, bớt chờ — việc thì xong sớm hơn.",
    },
    alwaysMovingForward: {
      title: "Cải tiến dựa trên cách người dùng thật sự sử dụng",
      copy: "Chúng tôi xem chỗ nào làm bạn chậm lại rồi sửa — không thêm cho có.",
    },
  },
  intent: {
    heading: "Bạn đang muốn làm gì?",
    lessRepetition: {
      title: "Bớt việc phải làm đi làm lại",
      copy: "Soạn, gửi, cập nhật — lặp hoài. Công cụ Khepree gom bớt các bước đó cho nhanh.",
    },
    fasterHardWork: {
      title: "Xử lý một việc khó nhanh hơn",
      copy: "Một việc tốn cả buổi? Công cụ đúng giúp bạn xử lý xong sớm hơn.",
    },
    aiWithoutTech: {
      title: "Dùng AI mà không cần rành kỹ thuật",
      copy: "Cần AI hỗ trợ nhưng không muốn cấu hình phức tạp? Chọn công cụ và dùng luôn.",
    },
    workAtScale: {
      title: "Làm việc gọn hơn khi công việc nhiều lên",
      copy: "Việc nhiều hơn mà quy trình vẫn gọn — không thêm bước thừa mỗi lần có việc mới.",
    },
  },
  audience: {
    heading: "Có giống tình huống của bạn không?",
    creators: {
      title: "Bớt việc lặp, dành thời gian sáng tạo",
      copy: "Dành thời gian cho việc đang làm — không phải soạn và gửi đi gửi lại.",
    },
    professionals: {
      title: "Công việc ổn định, ít phiền",
      copy: "Công cụ mở ra dùng được ngay, không phải học lại mỗi tháng.",
    },
    entrepreneurs: {
      title: "Vận hành gọn, bớt việc tay",
      copy: "Tự động hóa phần lặp lại để tập trung khách hàng và quyết định.",
    },
    businesses: {
      title: "Nhóm làm việc không loạn",
      copy: "Công cụ dùng chung, ai cũng biết việc mình — không thêm quy trình rườm rà.",
    },
  },
  philosophy: {
    heading: "Phần mềm tốt là phần mềm giúp bạn bớt việc.",
    copy: "Khepree không làm phần mềm chỉ để có thêm tính năng. Chúng tôi làm công cụ giúp một việc nhanh hơn, đơn giản hơn hoặc bớt phiền cho người đang làm.",
    stepIdea: "Ý tưởng",
    stepSoftware: "Khepree Software",
    stepResult: "Kết quả",
  },
  ecosystem: {
    heading: "Một hệ sinh thái — mỗi công cụ có việc riêng.",
    copy: "Chọn đúng nơi để quản lý tài khoản, tải phần mềm, hợp tác kinh doanh hoặc tích hợp kỹ thuật.",
    center: "Khepree",
    open: "Mở",
  },
  howItWorks: {
    heading: "Cách Khepree giúp bạn",
    step1: "Bạn có một việc cần xử lý",
    step2: "Chọn công cụ phù hợp",
    step3: "Hoàn thành với ít bước hơn",
  },
  technology: {
    heading: "Công nghệ mạnh ở bên trong. Dễ dùng ở bên ngoài.",
    copy: "AI và tự động hóa chạy phía sau — bạn nhận kết quả nhanh hơn mà không cần học cách hệ thống vận hành.",
    aiBenefit: "Gợi ý thông minh khi bạn cần — không phải bảng điều khiển đầy nút bấm.",
    automationBenefit: "Các bước lặp được gom lại để bạn bấm ít hơn và xong việc sớm hơn.",
    reliabilityBenefit: "Thiết kế để chạy nhanh và rõ ràng trên thiết bị bạn đang dùng.",
  },
  trust: {
    heading: "Những gì bạn có thể tin cậy",
    clearPayments: {
      title: "Giá rõ ràng",
      copy: "Giá thật trên từng sản phẩm. Thanh toán qua luồng quen thuộc — không có gói ẩn sau khi mua.",
    },
    purchasedProducts: {
      title: "Quản lý mọi sản phẩm trong một tài khoản",
      copy: "Đăng nhập để xem giấy phép, gói thuê bao và bản tải gắn với tài khoản của bạn.",
    },
    safeDownloads: {
      title: "Tải xuống được bảo vệ",
      copy: "Bộ cài chỉ được cấp khi tài khoản được phép — không liệt kê công khai trên website.",
    },
    vietnameseSupport: {
      title: "Hỗ trợ tiếng Việt",
      copy: "Nội dung tiếng Việt, giá VND và thanh toán quen thuộc khi đã được cấu hình.",
    },
  },
  global: {
    heading: "Làm việc bằng tiếng Việt, thanh toán quen thuộc.",
    copy: "Khepree ưu tiên trải nghiệm cho người dùng Việt Nam — ngôn ngữ, thanh toán và cách dùng hàng ngày. Khi mở rộng, chúng tôi giữ cùng một hướng: dễ dùng, không rườm rà.",
  },
  resources: {
    heading: "Cần hướng dẫn? Bắt đầu từ đây.",
    copy: "Chỉ hiện hướng dẫn và bài viết đã xuất bản — không có nội dung giữ chỗ.",
  },
  cta: {
    heading: "Bạn đang mất thời gian ở việc nào?",
    copy: "Xem các công cụ Khepree và chọn phần mềm phù hợp với việc bạn muốn giải quyết.",
    button: "Xem sản phẩm",
    signUp: "Tạo tài khoản",
  },
  footer: {
    products: "Sản phẩm",
    resources: "Tài nguyên",
    company: "Công ty",
    legal: "Pháp lý",
    language: "Ngôn ngữ",
    allProducts: "Tất cả sản phẩm",
    docs: "Tài liệu",
    blog: "Blog",
    about: "Giới thiệu",
    contact: "Liên hệ",
    security: "Bảo mật",
    privacy: "Quyền riêng tư",
    terms: "Điều khoản",
    copyright: "Bảo lưu mọi quyền.",
    ecosystem: "Các công cụ Khepree",
  },
  pages: {
    products: {
      title: "Sản phẩm",
      description: "Công cụ cho việc bạn đang cần làm.",
      intro: "Mỗi sản phẩm giải quyết một việc cụ thể. Có trên trang này nghĩa là bạn dùng được hôm nay.",
    },
    about: {
      title: "Từ tinh thần Khepri đến Khepree.",
      description: "Phần mềm giúp bạn bớt việc, không thêm việc.",
      intro: "Từ tinh thần Khepri đến Khepree.",
      tagline: "Khepree — Làm việc gọn hơn. Có thêm thời gian cho điều quan trọng.",
      story1:
        "Khepree lấy cảm hứng từ Khepri — biểu tượng mặt trời mọc và khởi đầu mới trong văn hóa Ai Cập cổ đại.",
      story2:
        "Chúng tôi mang tinh thần ấy vào công cụ hàng ngày. Phần mềm tốt không phải danh sách tính năng dài. Nó giúp bạn xong việc sớm hơn, bỏ qua bước không cần thiết và cảm thấy dễ dùng ngay lần đầu.",
      story3:
        "Mỗi sản phẩm Khepree bắt đầu bằng một câu hỏi: việc này giúp người dùng làm gì dễ hơn? Chúng tôi bắt đầu từ Việt Nam, làm cho người dùng Việt Nam trước, rồi mở rộng từng bước.",
    },
    contact: {
      title: "Liên hệ",
      description: "Hỏi đáp, góp ý hoặc hợp tác — chúng tôi đọc mọi tin nhắn.",
      intro: "Cho chúng tôi biết bạn đang cần làm gì. Chúng tôi đọc mọi tin nhắn.",
      email: "hello@khepree.com",
      emailLabel: "Gửi email hello@khepree.com",
    },
    blog: {
      title: "Blog",
      description: "Cập nhật và góc nhìn thực tế từ Khepree.",
      intro: "Chỉ hiện bài đã xuất bản — không có bài nháp hay nội dung giữ chỗ.",
      emptyTitle: "Chưa có bài viết nào được xuất bản",
      emptyDescription: "Khi chúng tôi xuất bản cập nhật, bài sẽ xuất hiện tại đây — danh sách này không được lấp bằng bài mẫu.",
      featuredLabel: "Bài nổi bật",
      tocLabel: "Mục lục",
      relatedHeading: "Bài viết liên quan",
    },
    docs: {
      title: "Tài liệu",
      description: "Cách dùng sản phẩm Khepree.",
      intro: "Chỉ hiện hướng dẫn đã xuất bản — trang này để trống thay vì hiện tài liệu giữ chỗ.",
      emptyTitle: "Chưa có tài liệu được xuất bản",
      emptyDescription: "Hướng dẫn sẽ xuất hiện khi sẵn sàng sử dụng. Trang này để trống thay vì hiện tài liệu giữ chỗ.",
    },
    security: {
      title: "Bảo mật",
      description: "Cách Khepree bảo vệ tài khoản, quyền truy cập, tải xuống và thanh toán.",
      intro: "Bảo mật nên là sự bảo vệ bạn có thể tin — không phải danh sách hệ thống nội bộ.",
      legalReview:
        "Trang này mô tả hành vi sản phẩm hiện tại. Đây không thay thế đánh giá bảo mật chuyên nghiệp trước khi ra mắt thương mại công khai.",
      benefits: [
        {
          title: "Bảo vệ tài khoản",
          copy: "Đăng nhập bảo vệ tài khoản bằng email, phiên riêng và xác minh bổ sung khi được bật. Đăng nhập không tự cấp quyền dùng sản phẩm.",
        },
        {
          title: "Kiểm soát truy cập",
          copy: "Bạn dùng được những gì mình thực sự được cấp — sau khi mua hoặc được cấp quyền — không phải theo tên gói.",
        },
        {
          title: "Tải xuống được bảo vệ",
          copy: "Bộ cài và tệp riêng không được liệt kê trên website công khai. Liên kết tải chỉ được cấp khi tài khoản được phép nhận tệp đó.",
        },
        {
          title: "An toàn thanh toán",
          copy: "Thông tin thẻ do dịch vụ thanh toán đang dùng xử lý. Khepree không lưu số thẻ đầy đủ. Trang thanh toán thành công không phải bằng chứng đã có quyền truy cập.",
        },
        {
          title: "Báo cáo bảo mật",
          copy: "Nếu bạn tìm thấy lỗ hổng, gửi email hello@khepree.com. Vui lòng không đăng chi tiết khai thác trên issue công khai.",
        },
      ],
      technicalHeading: "Chi tiết kỹ thuật",
      technical: [
        "Định danh (đăng nhập, phiên, Google tùy chọn) tách khỏi quyền dùng sản phẩm và khóa giấy phép.",
        "Định danh giấy phép được lưu dưới dạng hash. Lease ngoại tuyến được ký bằng khóa riêng, không bao giờ gửi ra trình duyệt.",
        "Tệp marketing công khai và tệp sản phẩm riêng dùng kho lưu trữ tách biệt. Tệp riêng không bao giờ fallback sang kho công khai.",
        "Ứng dụng công khai gửi security headers. Các route nhạy cảm bị giới hạn tốc độ. Cấu hình production được kiểm tra khi process khởi động.",
      ],
    },
    privacy: {
      title: "Chính sách quyền riêng tư",
      description: "Cách Khepree xử lý dữ liệu của bạn.",
      intro: "Mô tả website công khai và dịch vụ tài khoản hiện tại.",
      legalReview:
        "Đây là tóm tắt hướng tới người dùng về hành vi hiện tại. Đây không thay thế chính sách quyền riêng tư do luật sư rà soát trước khi ra mắt thương mại công khai.",
      paragraphs: [
        "Website marketing công khai không đặt cookie marketing hay analytics. Ngôn ngữ nằm trong URL (ví dụ /vi hoặc /en).",
        "Nếu bạn tạo tài khoản, chúng tôi lưu dữ liệu định danh cần để đăng nhập: email, phiên và bản ghi xác thực liên quan. Đăng nhập Google chỉ dùng khi đã được cấu hình.",
        "Đơn hàng, thanh toán và bản ghi quyền truy cập được lưu để cấp những gì bạn đã mua. Khi kết nối dịch vụ thanh toán thật, dữ liệu thẻ do dịch vụ đó xử lý — Khepree không lưu số thẻ đầy đủ.",
        "Định danh giấy phép và kích hoạt thiết bị được lưu dưới dạng hash, không phải serial phần cứng thô. Click giới thiệu đối tác lưu hash của mã khách truy cập.",
        "Tệp riêng (bộ cài, nội dung bài) được lưu riêng và không được liệt kê trên website công khai. Chúng tôi không bán dữ liệu cá nhân.",
        "Gửi email hello@khepree.com để hỏi về truy cập hoặc xóa dữ liệu tài khoản. Trang công khai, nội dung sản phẩm và trang pháp lý có thể được crawl như website công khai khác.",
      ],
    },
    terms: {
      title: "Điều khoản dịch vụ",
      description: "Điều khoản sử dụng sản phẩm và dịch vụ Khepree.",
      intro: "Các điều khoản này áp dụng cho website công khai và, khi bạn tạo tài khoản, cho tài khoản, giấy phép và bề mặt đối tác.",
      legalReview:
        "Điều khoản này mô tả quy tắc truy cập sản phẩm bằng ngôn ngữ đời thường. Đây không thay thế điều khoản do luật sư rà soát trước khi ra mắt thương mại công khai.",
      paragraphs: [
        "Khepree cung cấp phần mềm và dịch vụ liên quan như mô tả trên trang sản phẩm. Giá, gói và tính năng đến từ danh mục đang chạy. Nếu sản phẩm không được liệt kê, sản phẩm đó không được chào bán.",
        "Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và hoạt động trên tài khoản. Những gì bạn dùng được theo quyền gắn với tài khoản, không phải tên gói.",
        "Khóa giấy phép định danh một license. Chia sẻ khóa trái điều khoản sản phẩm, vượt giới hạn thiết bị, hoặc tấn công dịch vụ đều không được phép.",
        "Website công khai, tài liệu và blog được cung cấp nguyên trạng. Chúng tôi có thể thay đổi, tạm dừng hoặc gỡ sản phẩm chưa xuất bản.",
        "Quyền trả phí, hoàn tiền và hoa hồng đối tác tuân theo quy tắc đơn hàng và thanh toán tại thời điểm giao dịch. URL thanh toán thành công không phải bằng chứng đã có quyền truy cập.",
        "Câu hỏi: hello@khepree.com.",
      ],
    },
  },
} satisfies Messages;
