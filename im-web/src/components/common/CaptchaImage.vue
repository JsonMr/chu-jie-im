<template>
    <el-dialog v-dialogDrag class="captcha-image" :title="$t('common.verify')" width="400px" :visible.sync="isShow" 
        :before-close="onClose" :close-on-click-modal="false" :z-index="99">
        <el-form :model="formData" :rules="rules" ref="captchaForm">
            <el-form-item prop="code">
                <img class="img" :src="captchaImage" @click="loadCaptchaImage">
                <el-input v-model="formData.code" :placeholder="$t('register.inputCode')"></el-input>
            </el-form-item>
        </el-form>
        <span slot="footer" class="dialog-footer">
            <el-button @click="onClose()">{{ $t('common.cancel') }}</el-button>
            <el-button type="primary" @click="onOk()">{{ $t('common.confirm') }}</el-button>
        </span>
    </el-dialog>
</template>

<script>
export default {
    name: "captchaImage",
    components: {
    },
    computed: {
        rules() {
            return {
                code: [{ required: true, message: this.$t('register.inputCode'), trigger: 'blur' }]
            };
        }
    },
    data() {
        return {
            isShow: false,
            id: '',
            captchaImage: '',
            callback: null,
            formData: {
                code: ''
            },
        }
    },
    methods: {
        open(callback) {
            this.isShow = true;
            this.callback = callback;
            this.formData.code = ''; 
            this.loadCaptchaImage();
        },
        onClose() {
            this.isShow = false;
        },
        loadCaptchaImage() {
            this.$http({
                url: "/captcha/img/code",
                method: 'post'
            }).then((data) => {
                this.id = data.id;
                this.captchaImage = 'data:image/gif;base64,' + data.image;
            })
        },
        onOk() {
            this.$refs.captchaForm.validate((valid) => {
                if (valid) {
                    this.$http({
                        url: `/captcha/img/vertify?id=${this.id}&code=${this.formData.code}`,
                        method: 'get'
                    }).then((isPass) => {
                        if (!isPass) {
                            this.$message.error(this.$t('captcha.codeError'))
                        } else {
                            this.callback && this.callback( this.id, this.formData.code);
                            this.onClose();
                        }
                    })
                }
            });
        }
    }
}
</script>


<style lang="scss" scoped>
.captcha-image {
    .img {
        cursor: pointer;
    }
}
</style>