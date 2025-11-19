
# セットアップ手順

## 1. Dockerのインストール

- 公式サイト（[https://docs.docker.com/get-docker/](https://docs.docker.com/get-docker/)）から、ご自身のパソコンのOS（Windows, Mac, Linux）に合ったDockerをダウンロードし、画面の指示に従ってインストールしてください。
- インストール後、パソコンを再起動してください。

## 2. Docker Composeの利用確認

- Docker Desktopをインストールすると「docker compose」コマンドも使えるようになります。
- コマンドプロンプトやターミナルで以下を入力し、バージョン情報が表示されればOKです。

```bash
docker compose version
````

### 2.5. sudoなしでdockerコマンドを使う設定（Linuxの場合）

* Dockerは通常root権限が必要なため、Linux環境では `sudo` をつけないとエラーになります。
* 毎回 `sudo` を使いたくない場合は、以下の手順で現在のユーザーを `docker` グループに追加してください。

```bash
# docker グループを作成（存在しない場合のみ）
sudo groupadd docker

# 現在のユーザーを docker グループに追加
sudo usermod -aG docker $USER
```

* その後、ログアウトして再ログインするか、PCを再起動してください。
* 再ログイン後は、以下のように `sudo` なしで `docker` を使えるようになります。

```bash
docker ps
docker compose up
```

> ⚠️ セキュリティ上の注意：`docker` グループに入れるとrootと同等の権限を持つため、信頼できるユーザーのみ追加してください。

## 3. Gitのインストール

* 公式サイト（[https://git-scm.com/](https://git-scm.com/)）からGitをダウンロードし、画面の指示に従ってインストールしてください。

## 4. プロジェクトのダウンロード（クローン）

* コマンドプロンプトやターミナルで、保存したい場所に移動し、以下を実行します。

```bash
git clone git@github.com:tanaka0430/tokuteikadai.git
cd tokuteikadai 
```

## 5. .envファイルの作成

* プロジェクト内の `project/backend/.env.example` と `project/frontend/.env.example` をそれぞれコピーして、`.env` という名前のファイルを作成します。

### UNIX系（Mac/Linuxなど）:

```bash
cp project/backend/.env.example project/backend/.env
cp project/frontend/.env.example project/frontend/.env
```

### Windowsの場合:

```cmd
copy project\backend\.env.example project\backend\.env
copy project\frontend\.env.example project\frontend\.env
```

* `.env` ファイルの内容は、必要に応じて編集してください（APIキーなど）。

## 6. SQLファイルのダウンロード

* 以下のURLから `agu_syllabus_light.sql` をダウンロードし、プロジェクトのルートフォルダに保存してください。
  [https://drive.google.com/file/d/1uM0zgFbRSsTJJMQII0UNBeYfQbgW1DQG/view?usp=sharing](https://drive.google.com/file/d/1uM0zgFbRSsTJJMQII0UNBeYfQbgW1DQG/view?usp=sharing)

## 7. Dockerで開発環境を起動

* 以下のコマンドを実行します。

```bash
docker compose up --build -d
```

* これで必要なプログラムやデータベースが自動的に起動します。

## 8. データベースへデータを登録

* 以下のコマンドを順番に実行します。

```bash
docker cp agu_syllabus_structure.sql mysql:/agu_syllabus_structure.sql
docker cp agu_syllabus_light.sql mysql:/agu_syllabus_light.sql
docker exec -it mysql sh -c "mysql -u root -prootpassword tokuteikadai < /agu_syllabus_structure.sql"
docker exec -it mysql sh -c "mysql -u root -prootpassword tokuteikadai < /agu_syllabus_light.sql"
```

> ※「rootpassword」や「tokuteikadai」は、プロジェクトの設定に合わせて変更してください。

## 9. 動作確認

* ブラウザで [http://localhost:3000](http://localhost:3000) などにアクセスし、画面が表示されればセットアップ完了です。

* 以降はDocker Desktopを起動した状態で以下のコマンドを実行することで、再度上記アドレスからのアクセスが可能になります。

```bash
docker compose up --build -d
```

