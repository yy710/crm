'use strict'

const corpID = "ww29233ad949e808bf";

function urlencode2(str) {
    str = (str + '').toString();
    return encodeURIComponent(str).replace(/!/g, '%21').replace(/'/g, '%27').replace(/\(/g, '%28').
        replace(/\)/g, '%29').replace(/\*/g, '%2A').replace(/%20/g, '+');
}

function getTicket() {
    return axios.get(`/yz/referred/get-jsapi-ticket?url=${encodeURIComponent(window.location.href)}`)
        .then(res => {
            const ticket = res.data.sign;
            //console.log(ticket);
            wx.config({
                beta: true, // 必须这么写，否则wx.invoke调用形式的jsapi会有问题
                debug: true, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
                appId: corpID, // 必填，企业微信的corpID
                timestamp: ticket.timestamp, // 必填，生成签名的时间戳
                nonceStr: ticket.nonceStr, // 必填，生成签名的随机串
                signature: ticket.signature, // 必填，签名，见 附录-JS-SDK使用权限签名算法
                jsApiList: ["selectEnterpriseContact"] // 必填，需要使用的JS接口列表，凡是要调用的接口都需要传进来
            });
            return res.data.user;
        })
        .catch(err => console.log(err));
}