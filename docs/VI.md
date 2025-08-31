  <p align="center">
    Bản dịch ➜&nbsp;
      <a href="docs/TR.md"><img src="https://flagcdn.com/256x192/tr.png" width="48" alt="Cờ Thổ Nhĩ Kỳ"></a>
      <a href="docs/DE.md"><img src="https://flagcdn.com/256x192/de.png" width="48" alt="Cờ Đức"></a>
      <a href="docs/ES.md"><img src="https://flagcdn.com/256x192/es.png" width="48" alt="Cờ Tây Ban Nha"></a>
      <a href="docs/FR.md"><img src="https://flagcdn.com/256x192/fr.png" width="48" alt="Cờ Pháp"></a>
      <a href="docs/RU.md"><img src="https://flagcdn.com/256x192/ru.png" width="48" alt="Cờ Nga"></a>
      <a href="docs/JA.md"><img src="https://flagcdn.com/256x192/jp.png" width="48" alt="Cờ Nhật Bản"></a>
      <a href="docs/CN.md"><img src="https://flagcdn.com/256x192/cn.png" width="48" alt="Cờ Trung Quốc"></a>
  </p>
  <br>
  <br>
  <p align="center"><strong>🎬┃ Xem trước Video</strong></p>

  <p align="center">
    <video src="https://github.com/user-attachments/assets/f655b939-d1a7-4449-b7dc-e50463e53c37" width="720" height="400" controls></video>
  </p>
  <p align="center"><strong>Sử dụng tính năng mới</strong></p>

 <p align="center">
    <video src="https://github.com/user-attachments/assets/80409e34-79a3-42ab-b298-c062e7ffe1c1" width="720" height="400" controls></video>
  </p>
  ---

  > [!NOTE]
  > **Xin chào, sau khi các biện pháp mới được giới thiệu, tôi đã quyết định phát triển bot này, và nó đã hoàn thành chỉ trong một ngày. Do các biện pháp này, việc tạo ra một bot hoàn toàn tự động dường như là không thể vào lúc này. ~~Trước đây, nhờ một lỗ hổng, chúng tôi có thể vẽ từ 12 tài khoản trong một giây với một lần xác minh duy nhất (12 * 62 = <strong>744</strong> pixel/giây nếu các tài khoản đầy đủ).~~ Sau bản cập nhật, lỗ hổng này đã được khắc phục, vì vậy bạn sẽ cần lấy lại token cho mỗi lần gửi tài khoản. Nếu bạn đã sẵn sàng, tôi đã giải thích cách sử dụng nó dưới đây.**

  ---

  <p align="center"><strong>WPlace UltraBOT</strong></p>

  <p align="center">
    Bạn có thể thêm các pixel mong muốn của mình vào <a href="https://wplace.live" target="_blank">WPlace</a> bằng nhiều tài khoản của bạn.
  </p>

  ---

  <p align="center"><strong>🚀┃ Cách cài đặt bot:</strong></p>

  <p align="center">
  Bot dễ cài đặt nhưng khó thành thạo. Nói đùa thôi, ban đầu nó có vẻ khó sử dụng, nhưng sau các biện pháp mới nhất, không có bot nào khác hoạt động như thế này, vì vậy nỗ lực của bạn sẽ đáng giá.
  </p>

  <br>

  ### 🔧┃Cài đặt (VI)

  - Yêu cầu:
    - Node.js >= 18.18.0

  - Các bước:
    1. Cài đặt các phụ thuộc:
      
      ```bash
      npm install
      ```
    2. Khởi động ứng dụng:
      
      ```bash
      npm start
      ```
    3. Mở `http://localhost:3000` trong trình duyệt của bạn.

  <details open>
    <summary><h2>📖┃Hướng dẫn</h2></summary>

  ---

  ![Phần 1](https://i.imgur.com/yS9093x.png)

  Khi bạn truy cập localhost:3000, bạn sẽ thấy một trang như thế này.<br>

  ---

  ![Phần 2](https://i.imgur.com/taF0I2T.png)

  Mở một tab mới và truy cập liên kết này: `chrome://extensions/`<br>
  Bật chế độ nhà phát triển. <br>

  ![](https://i.imgur.com/oe42A42.png)

  Nhấp vào "Load unpacked". <br>

  ![](https://i.imgur.com/jPyzOr3.png)

  Chọn thư mục `WPlace-Helper`. <br>

  ---

  ![Phần 3](https://i.imgur.com/YVyvw3a.png)

  Truy cập trang wplace.live. <br>
  Nhấn F12.<br>
  Trên trang hiện ra, chọn mục 'Application' từ trên cùng (nếu bạn không tìm thấy, hãy nhấp vào chỗ tôi đã hiển thị bằng màu vàng và chọn nó).<br>
  Nhấp vào `cf_clearance` và sao chép giá trị của nó từ bên dưới.<br>

  ---

  ![Phần 4](https://i.imgur.com/tR8pS53.png)

  Quay lại bot.<br>
  Nhấp vào nút "Accounts", sau đó nhấp vào nút "Add Account". Dán giá trị bạn đã sao chép vào trường có nhãn 'cf_clearance' <br>
  Lưu ý ! <br>
  Với bản cập nhật mới nhất, họ đã thực hiện các biện pháp đối phó, vì vậy bây giờ bạn cần nhập giá trị cf_clearance cho mỗi tài khoản. Để thực hiện việc này nhanh chóng, chỉ cần truy cập trang wplace.live trong tab ẩn danh và lấy mã thông báo. Bạn không cần đăng nhập.



  ---

  ![Phần 5](https://i.imgur.com/vJkPMx8.png)

  Truy cập wplace.live, và khi bạn nhấp vào tiện ích mở rộng từ trên cùng, nó sẽ trông như thế này.<br>
  Sau khi đảm bảo phần "pixel token" được bật, hãy thử vẽ một pixel trên bản đồ bình thường. <br>

  ![Phần 5 (Lỗi)](https://i.imgur.com/uZmJDad.png)

  Nếu bạn nhận được lỗi bạn thấy trên màn hình, điều đó có nghĩa là bạn đang đi đúng hướng. Nhấp lại vào tiện ích mở rộng, và thông tin "World X" và "World Y" cho nơi bạn đã cố gắng vẽ sẽ xuất hiện. Sao chép chúng.

  ---

  ![Phần 6](https://i.imgur.com/LniE1E8.png)

  Khi bạn nhập tọa độ World X và World Y và nhấp vào nút 'fetch', một bản đồ như hình ảnh sẽ xuất hiện.

  ---

  ![Phần 7](https://i.imgur.com/vJkPMx8.png)

  Quay lại trang trước, nhấp vào tiện ích mở rộng và sao chép giá trị "Account Token".

  ---

  ![Phần 8](https://i.imgur.com/8sjhH1L.png)

  Tiếp theo, bạn sẽ được đưa đến phần Tài khoản. Nhấp vào nút "Add Account". Trang hiển thị ở trên sẽ xuất hiện.

  ![Phần 8](https://i.imgur.com/jf6W8NV.png)

  Bạn có thể nhập bất kỳ tên nào cho tài khoản. Tuy nhiên, trong trường "Account Token" bên dưới, dán giá trị bạn đã sao chép trong bước trước. Cuối cùng, nhấp "Add".

  ---

  ![Phần 9](https://i.imgur.com/DJUEywj.png)

  Sau khi bạn đã thêm bao nhiêu tài khoản tùy thích, bạn có thể xem tổng số pixel và số pixel khả dụng của tất cả các tài khoản của bạn ở góc trên bên phải.

  Hình ảnh bạn tải lên sẽ tự động được chuyển đổi sang bảng màu miễn phí có sẵn trên trang web và được tải lên theo cách đó. Hệ thống này sẽ được cải thiện hơn nữa trong tương lai.

  Khi bạn tải lên một hình ảnh bằng cách sử dụng nút Tải lên Hình ảnh:

  Ở phía trên bên trái của hình ảnh, số lượng pixel cần thiết cho hình ảnh sẽ được hiển thị.

  Ở phía trên bên phải của hình ảnh, có một nút khóa. Khi bạn khóa nó, bạn không thể di chuyển hình ảnh. Nhấp vào 'X' sẽ xóa hình ảnh.

  Bạn có thể xem tất cả các hình ảnh đã tải lên của mình trong thanh bên trái. Nếu bạn không tìm thấy một hình ảnh trên trang, chỉ cần nhấp vào nó trong thanh, và nó sẽ đưa bạn trực tiếp đến hình ảnh đó.

  ---

  ![Phần 10](https://i.imgur.com/Dzt1p3o.png)

  Nhấp vào nút Ready. Trong cửa sổ hiện ra, nhấp vào Chọn Tài khoản để chọn các tài khoản đang hoạt động của bạn. Khi bạn hoàn tất, nhấp lại vào Chọn Tài khoản để đóng cửa sổ.

  ---

  ![Phần 11](https://i.imgur.com/QKJRVL9.png)

  Khi bạn phóng to hình ảnh, mỗi pixel trong suốt bạn lấp đầy sẽ được tô màu bằng màu tương ứng từ hình ảnh bạn đã tải lên, và bạn chỉ có thể đặt pixel trong giới hạn của hình ảnh. Nếu bạn chọn một màu cụ thể, bạn có thể vẽ bất cứ nơi nào bạn muốn, lên đến dung lượng pixel tối đa của bạn.

  ---

  ![Phần 12](https://i.imgur.com/vJkPMx8.png)

  Quay lại trang wplace và vì token trước đó đã hết hạn, hãy thử gửi một pixel mới và sao chép pixel token mới.

  ---

  ![Phần 13](https://i.imgur.com/wDp07pH.png)

  Sau đó, quay lại trang của chúng tôi, dán giá trị vào trường 'token' và nhấp 'Start'.

  ---

  ![Phần 14](https://i.imgur.com/iQTH5TR.png)

  Nếu bạn đã thực hiện mọi thứ chính xác, bạn sẽ nhận được thông báo như thế này, và các thay đổi sẽ được xử lý trên bản đồ. Thế là xong; bạn có thể tạo bất kỳ hình ảnh nào bạn muốn bằng cách lặp lại các bước này.

  </details>


  <br>

  > [!IMPORTANT]
  > <p><sub><strong>1.</strong> Trong phần Tài khoản, nếu bạn nhấp vào 'Check Pixel', bạn có thể kiểm tra thủ công số pixel còn lại cho tài khoản đó. Thông thường, việc này được thực hiện tự động mỗi 90 giây.</sub></p>
  > <p><sub><strong>2.</strong> Mã thông báo tài khoản có hiệu lực trong khoảng 3-4 giờ. Trong quá trình kiểm tra tài khoản tự động, nếu mã thông báo hết hạn, tài khoản sẽ trở thành không hoạt động. Bạn có thể kích hoạt lại nó bằng cách nhập mã thông báo mới trong phần Chỉnh sửa và nhấp vào Kiểm tra Pixel.</sub></p>
  > <p><sub><strong>3.</strong> Khi mã thông báo gửi xuất hiện trên bảng điều khiển, bạn cần phải nhanh chóng. Nếu bạn quá chậm, mã thông báo sẽ hết hạn và bạn sẽ nhận được lỗi làm mới 403.</sub></p>

  <br>


  Vì toàn bộ dự án được chuẩn bị trong một ngày, vui lòng đừng quên báo cáo bất kỳ thiếu sót nào bạn thấy hoặc các tính năng bạn muốn yêu cầu.


  ---




  <p align="center">
    <img src="https://i.imgur.com/msR5dM9.png" alt="Main"/>
  </p>

  ---

  ### 📋┃Việc cần làm

  - [x] Bản dịch [TR/USA]  
  - [ ] Sửa lỗi script  
  - [x] Hướng dẫn


  ---


  <p align="center">
    <a href="#"><img src="https://komarev.com/ghpvc/?username=xacter&repo=WPlace-UltraBOT&style=for-the-badge&label=Views:&color=gray"/></a>
  </p>

  ---